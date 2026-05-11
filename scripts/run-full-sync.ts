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
    rawPayload: (listing.rawPayload as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
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

  const syncRun = await prisma.mlsSyncRun.create({
    data: { syncType: "full" },
  });

  console.log(`[sync] Started full sync run ${syncRun.id}`);

  let totalRecords = 0;
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  let batchNum = 0;
  let lastCursorTs: string | null = null;
  let lastCursorKey: string | null = null;

  try {
    for await (const delta of provider.fetchFullSync(1_000)) {
      batchNum++;
      const batchStart = Date.now();

      for (const listing of delta.listings) {
        try {
          const result = await upsertListing(listing);
          totalRecords++;
          if (result === "inserted") inserted++;
          else updated++;
        } catch (err) {
          errors++;
          if (errors <= 10) {
            const msg = err instanceof Error ? err.message : JSON.stringify(err);
            console.error(`[sync] Error on ${listing.mlsNumber}: ${msg}`);
          }
        }
      }

      lastCursorTs = delta.cursor?.lastTimestamp ?? null;
      lastCursorKey = delta.cursor?.lastKey ?? null;

      const elapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
      console.log(`[sync] Batch ${batchNum}: ${delta.listings.length} records in ${elapsed}s | Total: ${totalRecords} inserted=${inserted} updated=${updated} errors=${errors}`);

      await prisma.mlsSyncRun.update({
        where: { id: syncRun.id },
        data: {
          totalRecords,
          insertedCount: inserted,
          updatedCount: updated,
          errorCount: errors,
          cursor: lastCursorTs,
          cursorKey: lastCursorKey,
        },
      });
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
        cursor: lastCursorTs,
        cursorKey: lastCursorKey,
      },
    });

    console.log(`[sync] COMPLETED: ${totalRecords} records (${inserted} new, ${updated} updated, ${errors} errors)`);
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
        cursor: lastCursorTs,
        cursorKey: lastCursorKey,
      },
    });
    console.error(`[sync] FAILED after ${totalRecords} records:`, err);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main();
