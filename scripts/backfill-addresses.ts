// One-off: fills in the address fields added on 2026-11-06 for listings saved before then
// (street direction suffix, the seller's address-display choice, and the address sent to
// Geocodio). New and updated listings get them from the regular sync. Then moves listings
// whose seller withheld the address to their general area. Safe to re-run.
//
//   npx tsx scripts/backfill-addresses.ts --dry-run   # reads the feed only, writes nothing
//   npx tsx scripts/backfill-addresses.ts             # PORTAL_DATABASE_URL and AMPRE_API_TOKEN from .env/.dev.vars
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma-node/client";
import { AmpreResoProvider } from "../src/lib/mls/providers/ampre-reso";
import { locatePostalCode } from "../src/lib/mls/geocode";

const UPDATE_CHUNK = 1000;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!process.env.AMPRE_API_TOKEN) throw new Error("AMPRE_API_TOKEN is not set");
  if (!dryRun && !process.env.PORTAL_DATABASE_URL) throw new Error("PORTAL_DATABASE_URL is not set");

  const provider = new AmpreResoProvider();
  await provider.initialize({
    apiUrl: process.env.AMPRE_API_URL ?? "https://query.ampre.ca/odata",
    apiToken: process.env.AMPRE_API_TOKEN,
  });
  const prisma = dryRun
    ? null
    : new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.PORTAL_DATABASE_URL! }) });

  let after: string | null = null;
  let seen = 0;
  let updated = 0;
  let withheld = 0;
  let withSuffix = 0;
  let geocodable = 0;
  try {
    for (;;) {
      const rows = await provider.fetchActiveAddresses(after);
      if (rows.length === 0) break;
      after = rows[rows.length - 1].listingKey;
      seen += rows.length;
      withheld += rows.filter((r) => !r.addressDisplay).length;
      withSuffix += rows.filter((r) => r.streetDirSuffix).length;
      geocodable += rows.filter((r) => r.addressDisplay && r.geocodeAddress).length;

      if (prisma) {
        for (let i = 0; i < rows.length; i += UPDATE_CHUNK) {
          const values = rows.slice(i, i + UPDATE_CHUNK).map(
            (r) =>
              Prisma.sql`(${r.listingKey}, ${r.streetDirSuffix ?? null}::text, ${r.addressDisplay}::boolean, ${r.geocodeAddress ?? null}::text)`
          );
          updated += await prisma.$executeRaw`
            UPDATE "mls_listings" AS m
            SET "street_dir_suffix" = v.sfx, "address_display" = v.disp, "geocode_address" = v.addr
            FROM (VALUES ${Prisma.join(values)}) AS v(key, sfx, disp, addr)
            WHERE m."listing_key" = v.key`;
        }
      }
      console.log(`${seen} listings read (through ${after}), ${updated} updated`);
    }

    // Withheld addresses: general area only, and never sent to Geocodio
    let moved = 0;
    if (prisma) {
      const hidden = await prisma.mlsListing.findMany({
        // Spelled out: NOT { locationSource: "area" } alone skips rows where it's null
        where: { addressDisplay: false, OR: [{ locationSource: null }, { locationSource: { not: "area" } }] },
        select: { id: true, postalCode: true },
      });
      for (const l of hidden) {
        const area = await locatePostalCode(l.postalCode, { areaOnly: true });
        await prisma.mlsListing.update({
          where: { id: l.id },
          data: {
            latitude: area?.latitude ?? null,
            longitude: area?.longitude ?? null,
            locationSource: area ? "area" : null,
            locationPrecision: null,
            locationCredit: null,
          },
        });
        moved++;
      }
    }

    console.log(
      `\nActive listings in the feed: ${seen}` +
        `\n  seller withheld the address: ${withheld}` +
        `\n  with a street direction suffix (E, W, ...): ${withSuffix}` +
        `\n  with an address Geocodio can look up: ${geocodable}` +
        (prisma ? `\nRows updated: ${updated}; withheld listings moved to their area: ${moved}` : "\nDry run: nothing written")
    );
  } finally {
    await prisma?.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
