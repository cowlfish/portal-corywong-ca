import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { AmpreResoProvider } from "../src/lib/mls/providers/ampre-reso";
import type { MlsFeedListing, MlsFeedDelta } from "../src/lib/mls/types";

const STATUS_MAP: Record<string, string> = {
  Active: "ACTIVE",
  Sold: "SOLD",
  Terminated: "TERMINATED",
  Expired: "EXPIRED",
  Suspended: "SUSPENDED",
  Deleted: "DELETED",
};

const url = process.env.PORTAL_DATABASE_URL!;
if (!url) {
  console.error("PORTAL_DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function upsertListing(listing: MlsFeedListing): Promise<"inserted" | "updated"> {
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
    await prisma.mlsListing.update({ where: { mlsNumber: listing.mlsNumber }, data });
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

    return "inserted";
  }
}

async function main() {
  const provider = new AmpreResoProvider();
  await provider.initialize({
    apiUrl: "https://query.ampre.ca/odata",
    apiToken: process.env.AMPRE_API_TOKEN!,
  });

  // Resume from last incomplete run if one exists
  let existingRun = await prisma.mlsSyncRun.findFirst({
    where: { status: "RUNNING", syncType: "full" },
    orderBy: { startedAt: "desc" },
  });

  let syncRunId: string;
  let totalRecords = 0;
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let batchNum = 0;
  let startCursor: { lastTimestamp: string; lastKey: string } | null = null;

  if (existingRun?.cursor && existingRun?.cursorKey) {
    syncRunId = existingRun.id;
    totalRecords = existingRun.totalRecords;
    inserted = existingRun.insertedCount;
    updated = existingRun.updatedCount;
    errors = existingRun.errorCount;
    startCursor = { lastTimestamp: existingRun.cursor, lastKey: existingRun.cursorKey };
    console.log(`[sync] Resuming run ${syncRunId} from cursor ${startCursor.lastTimestamp}/${startCursor.lastKey} (${totalRecords} records already processed)`);
  } else {
    const syncRun = await prisma.mlsSyncRun.create({ data: { syncType: "full" } });
    syncRunId = syncRun.id;
    console.log(`[sync] Started new full sync run ${syncRunId}`);
  }

  let lastCursorTs: string | null = startCursor?.lastTimestamp ?? null;
  let lastCursorKey: string | null = startCursor?.lastKey ?? null;

  // Build the async generator manually to support a starting cursor
  let cursor = startCursor;
  let hasMore = true;

  try {
    while (hasMore) {
      const filter = cursor
        ? `ModificationTimestamp gt ${cursor.lastTimestamp} or ` +
          `(ModificationTimestamp eq ${cursor.lastTimestamp} and ListingKey gt '${cursor.lastKey}')`
        : `StandardStatus eq 'Active'`;

      const url =
        `/Property?$filter=${encodeURIComponent(filter)}` +
        `&$orderby=${encodeURIComponent("ModificationTimestamp asc,ListingKey asc")}` +
        `&$top=1000`;

      const data = await (provider as any).request(url);
      const rows = (data.value ?? []) as Record<string, unknown>[];
      const listings = rows.map((r: Record<string, unknown>) => (provider as any).mapListing(r));

      batchNum++;
      const batchStart = Date.now();

      for (const listing of listings) {
        try {
          const result = await upsertListing(listing);
          totalRecords++;
          if (result === "inserted") inserted++;
          else updated++;
        } catch (err) {
          errors++;
          if (errors <= 20) {
            const msg = err instanceof Error ? err.message : JSON.stringify(err);
            console.error(`[sync] Error on ${listing.mlsNumber}: ${msg}`);
          }
        }
      }

      if (listings.length > 0) {
        const last = listings[listings.length - 1];
        lastCursorTs = last.feedUpdatedAt.toISOString();
        lastCursorKey = last.listingKey;
        cursor = { lastTimestamp: lastCursorTs!, lastKey: lastCursorKey! };
      }

      hasMore = rows.length === 1000;

      const elapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
      console.log(`[sync] Batch ${batchNum}: ${listings.length} records in ${elapsed}s | Total: ${totalRecords} inserted=${inserted} updated=${updated} errors=${errors}`);

      try {
        await prisma.mlsSyncRun.update({
          where: { id: syncRunId },
          data: { totalRecords, insertedCount: inserted, updatedCount: updated, errorCount: errors, cursor: lastCursorTs, cursorKey: lastCursorKey },
        });
      } catch {
        console.warn(`[sync] Could not update sync run record — continuing anyway`);
      }
    }

    try {
      await prisma.mlsSyncRun.update({
        where: { id: syncRunId },
        data: { status: "COMPLETED", completedAt: new Date(), totalRecords, insertedCount: inserted, updatedCount: updated, errorCount: errors, cursor: lastCursorTs, cursorKey: lastCursorKey },
      });
    } catch {
      console.warn(`[sync] Could not mark sync run as COMPLETED`);
    }

    console.log(`[sync] COMPLETED: ${totalRecords} records (${inserted} new, ${updated} updated, ${errors} errors)`);
  } catch (err) {
    try {
      await prisma.mlsSyncRun.update({
        where: { id: syncRunId },
        data: { status: "FAILED", completedAt: new Date(), totalRecords, insertedCount: inserted, updatedCount: updated, errorCount: errors + 1, cursor: lastCursorTs, cursorKey: lastCursorKey },
      });
    } catch {
      console.warn(`[sync] Could not mark sync run as FAILED`);
    }
    console.error(`[sync] FAILED after ${totalRecords} records:`, err);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main();
