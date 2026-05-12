import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import type {
  MlsFeedProvider,
  MlsFeedDelta,
  MlsFeedListing,
  ReplicationCursor,
} from "../types";

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

export async function runDeltaSync(
  provider: MlsFeedProvider
): Promise<SyncResult> {
  const startTime = Date.now();

  const lastRun = await prisma.mlsSyncRun.findFirst({
    where: { status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
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
  const errorDetails: Array<{ mlsNumber: string; error: string }> = [];

  try {
    let hasMore = true;

    while (hasMore) {
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

      currentCursor = delta.cursor;
      hasMore = delta.hasMore;
    }

    await prisma.mlsSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        totalRecords,
        insertedCount: inserted,
        updatedCount: updated,
        deletedCount: deleted,
        errorCount: errors,
        cursor: currentCursor?.lastTimestamp,
        cursorKey: currentCursor?.lastKey,
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
        deletedCount: deleted,
        errorCount: errors + 1,
        cursor: currentCursor?.lastTimestamp,
        cursorKey: currentCursor?.lastKey,
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
  };
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
        data: listing.photos.map((p) => ({
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
        data: listing.photos.map((p) => ({
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
