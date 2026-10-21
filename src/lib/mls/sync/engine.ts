import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { locatePostalCode } from "../geocode";
import type {
  MlsFeedProvider,
  MlsFeedDelta,
  MlsFeedListing,
  ReplicationCursor,
} from "../types";

// The mirror keeps only the cover photo; listing pages fetch the full gallery live.
// (~40 photos per listing across ~100k listings would be several GB.)
const STORED_PHOTOS_PER_LISTING = 1;

const STATUS_MAP: Record<string, string> = {
  Active: "ACTIVE",
  Sold: "SOLD",
  Terminated: "TERMINATED",
  Expired: "EXPIRED",
  Suspended: "SUSPENDED",
  Deleted: "DELETED",
};

export interface SyncResult {
  syncRunId: string;
  totalRecords: number;
  inserted: number;
  updated: number;
  deleted: number;
  errors: number;
  durationMs: number;
}

// Limits per run, sized for a 15-minute Cron Trigger (15 min wall time, 30 s CPU).
// A normal run is 1–2 pages (~60 changes per 15 min); a backlog drains over successive runs.
const DELTA_MAX_PAGES = 20;
const DELTA_MAX_MS = 8 * 60 * 1000;
// A RUNNING row older than this is a run that died without recording its end
const STALE_RUN_MS = 14 * 60 * 1000;

export interface DeltaSyncResult extends SyncResult {
  skipped?: "already-running";
  // False when the run stopped at its page or time limit; the next run continues
  caughtUp: boolean;
}

export async function runDeltaSync(
  provider: MlsFeedProvider,
  { maxPages = DELTA_MAX_PAGES, maxMs = DELTA_MAX_MS } = {}
): Promise<DeltaSyncResult> {
  const startTime = Date.now();

  // Don't overlap with a run still in progress (e.g. a slow backlog run)
  const running = await prisma.mlsSyncRun.findFirst({
    where: { status: "RUNNING", syncType: "delta" },
    orderBy: { startedAt: "desc" },
  });
  if (running && Date.now() - running.startedAt.getTime() < STALE_RUN_MS) {
    return {
      syncRunId: running.id, totalRecords: 0, inserted: 0, updated: 0, deleted: 0, errors: 0,
      durationMs: 0, skipped: "already-running", caughtUp: false,
    };
  }
  await prisma.mlsSyncRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: new Date(Date.now() - STALE_RUN_MS) } },
    data: { status: "FAILED", completedAt: new Date() },
  });

  // The cursor is saved after every page, so resume from the latest run that made progress,
  // even one that failed part-way.
  const lastRun = await prisma.mlsSyncRun.findFirst({
    where: { cursor: { not: null }, cursorKey: { not: null } },
    orderBy: { startedAt: "desc" },
  });

  const lastCursor: ReplicationCursor | null =
    lastRun?.cursor && lastRun?.cursorKey
      ? { lastTimestamp: lastRun.cursor, lastKey: lastRun.cursorKey }
      : null;

  const syncRun = await prisma.mlsSyncRun.create({
    data: {
      syncType: "delta",
      cursor: lastCursor?.lastTimestamp,
      cursorKey: lastCursor?.lastKey,
    },
  });

  let totalRecords = 0;
  let inserted = 0;
  let updated = 0;
  let deleted = 0;
  let errors = 0;
  let currentCursor = lastCursor;
  let caughtUp = false;
  const errorDetails: Array<{ mlsNumber: string; error: string }> = [];

  const counts = () => ({
    totalRecords,
    insertedCount: inserted,
    updatedCount: updated,
    deletedCount: deleted,
    errorCount: errors,
    cursor: currentCursor?.lastTimestamp,
    cursorKey: currentCursor?.lastKey,
  });

  try {
    for (let page = 0; page < maxPages && Date.now() - startTime < maxMs; page++) {
      const delta: MlsFeedDelta = await provider.fetchDelta(currentCursor);

      for (const listing of delta.listings) {
        try {
          const result = await upsertListing(listing);
          totalRecords++;
          if (result === "inserted") inserted++;
          else updated++;
        } catch (err) {
          errors++;
          errorDetails.push({
            mlsNumber: listing.mlsNumber,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      for (const mlsNumber of delta.deletedMlsNumbers) {
        try {
          await markListingDeleted(mlsNumber);
          deleted++;
          totalRecords++;
        } catch (err) {
          errors++;
          errorDetails.push({
            mlsNumber,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (delta.cursor) currentCursor = delta.cursor;
      // Checkpoint, so a run cut off by the platform still keeps its progress
      await prisma.mlsSyncRun.update({ where: { id: syncRun.id }, data: counts() });

      if (!delta.hasMore) {
        caughtUp = true;
        break;
      }
    }

    await prisma.mlsSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        ...counts(),
        errorDetails:
          errorDetails.length > 0
            ? (errorDetails as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
    });
  } catch (err) {
    await prisma.mlsSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        ...counts(),
        errorCount: errors + 1,
        errorDetails: [
          ...errorDetails,
          {
            mlsNumber: "_sync",
            error: err instanceof Error ? err.message : String(err),
          },
        ] as unknown as Prisma.InputJsonValue,
      },
    });
    throw err;
  }

  return {
    syncRunId: syncRun.id,
    totalRecords,
    inserted,
    updated,
    deleted,
    errors,
    durationMs: Date.now() - startTime,
    caughtUp,
  };
}

export interface ReconcileResult {
  feedListings: number;
  activeInMirror: number;
  removed: number;
}

// Marks mirror listings DELETED once they're no longer in the feed (sold, expired, withdrawn).
// Without this they would stay ACTIVE and keep showing on public pages.
export async function reconcileRemovedListings(provider: MlsFeedProvider): Promise<ReconcileResult> {
  const feedKeys = await provider.fetchAllListingKeys();
  const active = await prisma.mlsListing.findMany({
    where: { status: "ACTIVE" },
    select: { listingKey: true },
  });

  // A short or failed key listing must not wipe the mirror
  if (feedKeys.size < active.length * 0.8) {
    throw new Error(
      `Feed returned ${feedKeys.size} listings but the mirror has ${active.length} active; not reconciling`
    );
  }

  const gone = active.map((l) => l.listingKey).filter((k) => !feedKeys.has(k));
  let removed = 0;
  for (let i = 0; i < gone.length; i += 1000) {
    const { count } = await prisma.mlsListing.updateMany({
      where: { listingKey: { in: gone.slice(i, i + 1000) }, status: "ACTIVE" },
      data: { status: "DELETED", statusChangeAt: new Date() },
    });
    removed += count;
  }

  return { feedListings: feedKeys.size, activeInMirror: active.length, removed };
}

export async function runFullSync(
  provider: MlsFeedProvider,
  batchSize = 10_000
): Promise<SyncResult> {
  const startTime = Date.now();

  const syncRun = await prisma.mlsSyncRun.create({
    data: { syncType: "full" },
  });

  let totalRecords = 0;
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let lastCursor: ReplicationCursor | null = null;
  const errorDetails: Array<{ mlsNumber: string; error: string }> = [];

  try {
    for await (const delta of provider.fetchFullSync(batchSize)) {
      for (const listing of delta.listings) {
        try {
          const result = await upsertListing(listing);
          totalRecords++;
          if (result === "inserted") inserted++;
          else updated++;
        } catch (err) {
          errors++;
          errorDetails.push({
            mlsNumber: listing.mlsNumber,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      lastCursor = delta.cursor;
    }

    await prisma.mlsSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        totalRecords,
        insertedCount: inserted,
        updatedCount: updated,
        errorCount: errors,
        cursor: lastCursor?.lastTimestamp,
        cursorKey: lastCursor?.lastKey,
        errorDetails:
          errorDetails.length > 0
            ? (errorDetails as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
    });
  } catch (err) {
    await prisma.mlsSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        totalRecords,
        insertedCount: inserted,
        updatedCount: updated,
        errorCount: errors + 1,
        cursor: lastCursor?.lastTimestamp,
        cursorKey: lastCursor?.lastKey,
        errorDetails: [
          ...errorDetails,
          {
            mlsNumber: "_sync",
            error: err instanceof Error ? err.message : String(err),
          },
        ] as unknown as Prisma.InputJsonValue,
      },
    });
    throw err;
  }

  return {
    syncRunId: syncRun.id,
    totalRecords,
    inserted,
    updated,
    deleted: 0,
    errors,
    durationMs: Date.now() - startTime,
  };
}

async function upsertListing(
  listing: MlsFeedListing
): Promise<"inserted" | "updated"> {
  const existing = await prisma.mlsListing.findUnique({
    where: { mlsNumber: listing.mlsNumber },
    select: { id: true, listPrice: true },
  });

  // The feed has no coordinates; place the listing at its postal code
  if (listing.latitude == null || listing.longitude == null) {
    const location = await locatePostalCode(listing.postalCode);
    if (location) {
      listing.latitude = location.latitude;
      listing.longitude = location.longitude;
    }
  }

  const data = {
    listingKey: listing.listingKey,
    boardId: listing.boardId,
    status: (STATUS_MAP[listing.status] ?? "ACTIVE") as "ACTIVE",
    statusChangeAt: listing.statusChangeAt,
    listPrice: listing.listPrice,
    soldPrice: listing.soldPrice,
    originalPrice: listing.originalPrice,
    propertyType: listing.propertyType,
    propertySubType: listing.propertySubType,
    transactionType: listing.transactionType,
    streetNumber: listing.streetNumber,
    streetName: listing.streetName,
    streetSuffix: listing.streetSuffix,
    streetDirection: listing.streetDirection,
    unitNumber: listing.unitNumber,
    city: listing.city,
    province: listing.province,
    postalCode: listing.postalCode,
    country: listing.country,
    municipality: listing.municipality,
    community: listing.community,
    neighbourhood: listing.neighbourhood,
    area: listing.area,
    latitude: listing.latitude,
    longitude: listing.longitude,
    bedrooms: listing.bedrooms,
    bedroomsPlus: listing.bedroomsPlus,
    bathrooms: listing.bathrooms,
    bathroomsHalf: listing.bathroomsHalf,
    sqft: listing.sqft,
    sqftRangeMin: listing.sqftRangeMin,
    sqftRangeMax: listing.sqftRangeMax,
    lotSizeSqft: listing.lotSizeSqft,
    lotFrontage: listing.lotFrontage,
    lotDepth: listing.lotDepth,
    yearBuilt: listing.yearBuilt,
    stories: listing.stories,
    parkingSpaces: listing.parkingSpaces,
    garageType: listing.garageType,
    garageSpaces: listing.garageSpaces,
    maintenanceFee: listing.maintenanceFee,
    condoExposure: listing.condoExposure,
    condoStyle: listing.condoStyle,
    balcony: listing.balcony,
    locker: listing.locker,
    listDate: listing.listDate,
    soldDate: listing.soldDate,
    expiryDate: listing.expiryDate,
    daysOnMarket: listing.daysOnMarket,
    virtualTourUrl: listing.virtualTourUrl,
    publicRemarks: listing.publicRemarks,
    extrasRemarks: listing.extrasRemarks,
    featuresRemarks: listing.featuresRemarks,
    taxAmount: listing.taxAmount,
    taxYear: listing.taxYear,
    assessedValue: listing.assessedValue,
    listAgentName: listing.listAgentName,
    listAgentId: listing.listAgentId,
    listOfficeName: listing.listOfficeName,
    listOfficeId: listing.listOfficeId,
    coListAgentName: listing.coListAgentName,
    coListAgentId: listing.coListAgentId,
    feedSourceId: listing.feedSourceId,
    feedUpdatedAt: listing.feedUpdatedAt,
    majorChangeTimestamp: listing.majorChangeTimestamp,
    photosChangeTimestamp: listing.photosChangeTimestamp,
    // rawPayload omitted — exceeds Neon free tier 512 MB limit at scale
  };

  if (existing) {
    if (
      listing.listPrice &&
      existing.listPrice &&
      Number(existing.listPrice) !== listing.listPrice
    ) {
      await prisma.mlsPriceHistory.create({
        data: {
          listingId: existing.id,
          changeDate: new Date(),
          oldPrice: existing.listPrice,
          newPrice: listing.listPrice,
          changeType:
            listing.listPrice > Number(existing.listPrice)
              ? "increase"
              : "decrease",
        },
      });
    }

    await prisma.mlsListing.update({
      where: { mlsNumber: listing.mlsNumber },
      data,
    });

    if (listing.photos && listing.photos.length > 0) {
      await prisma.mlsListingPhoto.deleteMany({
        where: { listingId: existing.id },
      });
      await prisma.mlsListingPhoto.createMany({
        data: listing.photos.slice(0, STORED_PHOTOS_PER_LISTING).map((p) => ({
          listingId: existing.id,
          photoUrl: p.photoUrl,
          displayOrder: p.displayOrder,
          caption: p.caption,
          mediaType: p.mediaType,
          width: p.width,
          height: p.height,
        })),
      });
    }

    if (listing.rooms && listing.rooms.length > 0) {
      await prisma.mlsPropertyRoom.deleteMany({
        where: { listingId: existing.id },
      });
      await prisma.mlsPropertyRoom.createMany({
        data: listing.rooms.map((r) => ({
          listingId: existing.id,
          roomKey: r.roomKey,
          roomType: r.roomType,
          roomLevel: r.roomLevel,
          roomDimensions: r.roomDimensions,
          roomArea: r.roomArea,
          roomDescription: r.roomDescription,
        })),
      });
    }

    if (listing.openHouses && listing.openHouses.length > 0) {
      await prisma.mlsOpenHouse.deleteMany({
        where: { listingId: existing.id },
      });
      await prisma.mlsOpenHouse.createMany({
        data: listing.openHouses.map((oh) => ({
          listingId: existing.id,
          startDate: oh.startDate,
          endDate: oh.endDate,
          remarks: oh.remarks,
          type: oh.type,
        })),
      });
    }

    return "updated";
  } else {
    const created = await prisma.mlsListing.create({
      data: { mlsNumber: listing.mlsNumber, ...data },
    });

    if (listing.photos && listing.photos.length > 0) {
      await prisma.mlsListingPhoto.createMany({
        data: listing.photos.slice(0, STORED_PHOTOS_PER_LISTING).map((p) => ({
          listingId: created.id,
          photoUrl: p.photoUrl,
          displayOrder: p.displayOrder,
          caption: p.caption,
          mediaType: p.mediaType,
          width: p.width,
          height: p.height,
        })),
      });
    }

    if (listing.rooms && listing.rooms.length > 0) {
      await prisma.mlsPropertyRoom.createMany({
        data: listing.rooms.map((r) => ({
          listingId: created.id,
          roomKey: r.roomKey,
          roomType: r.roomType,
          roomLevel: r.roomLevel,
          roomDimensions: r.roomDimensions,
          roomArea: r.roomArea,
          roomDescription: r.roomDescription,
        })),
      });
    }

    if (listing.openHouses && listing.openHouses.length > 0) {
      await prisma.mlsOpenHouse.createMany({
        data: listing.openHouses.map((oh) => ({
          listingId: created.id,
          startDate: oh.startDate,
          endDate: oh.endDate,
          remarks: oh.remarks,
          type: oh.type,
        })),
      });
    }

    return "inserted";
  }
}

async function markListingDeleted(mlsNumber: string): Promise<void> {
  await prisma.mlsListing.updateMany({
    where: { mlsNumber, status: { not: "DELETED" } },
    data: { status: "DELETED", statusChangeAt: new Date() },
  });
}

// Neon's free tier caps the database at 512 MB, and listings marked DELETED by the
// reconcile pass would otherwise pile up at a few MB a day. Removes them once they've been
// off the market for a while, unless a client or Cory has something attached to them.
const PRUNE_AFTER_DAYS = 30;

export async function pruneRemovedListings(olderThanDays = PRUNE_AFTER_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  let pruned = 0;
  for (;;) {
    const batch = await prisma.mlsListing.findMany({
      where: {
        status: { not: "ACTIVE" },
        statusChangeAt: { lt: cutoff },
        favorites: { none: {} },
        propertyAlerts: { none: {} },
        tourStops: { none: {} },
        cmaComps: { none: {} },
        comments: { none: {} },
        showingRequests: { none: {} },
      },
      select: { id: true },
      take: 500,
    });
    if (batch.length === 0) return pruned;
    // Photos, rooms, open houses and price history cascade
    const { count } = await prisma.mlsListing.deleteMany({ where: { id: { in: batch.map((l) => l.id) } } });
    pruned += count;
  }
}

// Listings saved before the TRREB field names were mapped (2026-10-21) are missing their
// list date, community and area. Re-fetches them from the feed in batches until none are
// left; each pass skips listings touched in the last 6 hours so ones the feed can't fill
// don't loop.
export async function backfillListingDetails(
  provider: MlsFeedProvider,
  { maxListings = 500, maxMs = 20_000 } = {}
): Promise<{ refreshed: number; remaining: number }> {
  const startTime = Date.now();
  const where = {
    status: "ACTIVE" as const,
    listDate: null,
    updatedAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
  };
  let refreshed = 0;
  while (refreshed < maxListings && Date.now() - startTime < maxMs) {
    const batch = await prisma.mlsListing.findMany({ where, select: { listingKey: true }, take: 50 });
    if (batch.length === 0) break;
    const fresh = await provider.fetchListingsByKeys(batch.map((l) => l.listingKey));
    for (const listing of fresh) {
      await upsertListing(listing);
      refreshed++;
    }
    // Keys the feed didn't return are left for the daily reconcile; mark them touched
    const returned = new Set(fresh.map((l) => l.listingKey));
    const missing = batch.map((l) => l.listingKey).filter((k) => !returned.has(k));
    if (missing.length) {
      await prisma.mlsListing.updateMany({ where: { listingKey: { in: missing } }, data: { updatedAt: new Date() } });
    }
  }
  const remaining = await prisma.mlsListing.count({ where });
  return { refreshed, remaining };
}

// Places listings saved without coordinates at their postal code. No feed calls: the lookup
// is local data, so this is cheap enough to clear a large backlog in one daily run.
export async function geocodeListings({ maxListings = 2000, maxMs = 15_000 } = {}): Promise<{ located: number; remaining: number }> {
  const startTime = Date.now();
  const where = {
    status: "ACTIVE" as const,
    latitude: null,
    postalCode: { not: null },
    updatedAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
  };
  let located = 0;
  let processed = 0;
  while (processed < maxListings && Date.now() - startTime < maxMs) {
    const batch = await prisma.mlsListing.findMany({ where, select: { id: true, postalCode: true }, take: 200 });
    if (batch.length === 0) break;
    const unknown: string[] = [];
    for (const l of batch) {
      processed++;
      const location = await locatePostalCode(l.postalCode);
      if (!location) {
        unknown.push(l.id);
        continue;
      }
      await prisma.mlsListing.update({
        where: { id: l.id },
        data: { latitude: location.latitude, longitude: location.longitude },
      });
      located++;
    }
    // Postal codes outside the data (e.g. other provinces): don't retry for 6 hours
    if (unknown.length) {
      await prisma.mlsListing.updateMany({ where: { id: { in: unknown } }, data: { updatedAt: new Date() } });
    }
  }
  const remaining = await prisma.mlsListing.count({ where });
  return { located, remaining };
}

// Open houses live in their own feed resource (a few thousand upcoming at any time), so
// they're refreshed wholesale rather than per listing.
export async function syncOpenHouses(provider: MlsFeedProvider): Promise<{ openHouses: number; listings: number }> {
  const upcoming = await provider.fetchUpcomingOpenHouses();
  const keys = [...new Set(upcoming.map((o) => o.listingKey))];
  const idByKey = new Map<string, string>();
  for (let i = 0; i < keys.length; i += 1000) {
    const rows = await prisma.mlsListing.findMany({
      where: { listingKey: { in: keys.slice(i, i + 1000) } },
      select: { id: true, listingKey: true },
    });
    for (const r of rows) idByKey.set(r.listingKey, r.id);
  }
  const data = upcoming
    .filter((o) => idByKey.has(o.listingKey))
    .map((o) => ({ listingId: idByKey.get(o.listingKey)!, startDate: o.startDate, endDate: o.endDate, remarks: o.remarks, type: o.type }));

  await prisma.$transaction([
    prisma.mlsOpenHouse.deleteMany({}),
    prisma.mlsOpenHouse.createMany({ data }),
  ]);
  return { openHouses: data.length, listings: new Set(data.map((d) => d.listingId)).size };
}
