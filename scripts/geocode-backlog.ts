// One-off: geocodes the backlog of listings waiting for Geocodio in one go, using paid credits,
// instead of the 15-minute sync's free ~2,400 a day. Same rules as geocodeStreetAddresses in
// src/lib/mls/sync/engine.ts. Works oldest-first, so it doesn't overlap with the sync (newest
// first). Stops cleanly if Geocodio refuses a request (e.g. out of credit): listings it didn't
// reach stay queued for the daily sync. Safe to stop and re-run.
//
//   npx tsx scripts/geocode-backlog.ts --max 75900   # PORTAL_DATABASE_URL in .env, GEOCODIO_API_KEY in .dev.vars
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma-node/client";
import { geocodeAddresses } from "../src/lib/mls/geocode";
import { NOT_COMMERCIAL } from "../src/lib/mls/listing-scope";

// Geocodio pay-as-you-go allows 1,000 lookups a minute
const BATCH = 1000;
const MIN_BATCH_MS = 61_000;

async function main() {
  const maxArg = process.argv.indexOf("--max");
  const max = maxArg > 0 ? Number(process.argv[maxArg + 1]) : NaN;
  if (!Number.isFinite(max) || max <= 0) throw new Error("Pass --max <lookups> (your credit budget)");
  const apiKey = process.env.GEOCODIO_API_KEY;
  if (!apiKey) throw new Error("GEOCODIO_API_KEY is not set");
  if (!process.env.PORTAL_DATABASE_URL) throw new Error("PORTAL_DATABASE_URL is not set");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.PORTAL_DATABASE_URL }) });

  const where = {
    status: "ACTIVE" as const,
    AND: [NOT_COMMERCIAL],
    addressDisplay: true,
    geocodeAddress: { not: null },
    geocodedAt: null,
  };
  let looked = 0;
  let placed = 0;
  try {
    while (looked < max) {
      const started = Date.now();
      const batch = await prisma.mlsListing.findMany({
        where,
        select: { id: true, geocodeAddress: true },
        orderBy: { createdAt: "asc" },
        take: Math.min(BATCH, max - looked),
      });
      if (batch.length === 0) break;

      let results;
      try {
        results = await geocodeAddresses(Object.fromEntries(batch.map((l) => [l.id, l.geocodeAddress!])), apiKey);
      } catch (err) {
        console.error(`Stopping: ${err instanceof Error ? err.message : err}`);
        break;
      }

      const now = new Date();
      const rows = batch.map((l) => {
        const r = results[l.id];
        if (r?.usable) placed++;
        return r?.usable
          ? Prisma.sql`(${l.id}, ${r.latitude}::numeric, ${r.longitude}::numeric, 'geocodio', ${r.precision}, ${r.credit}::text, true)`
          : Prisma.sql`(${l.id}, NULL::numeric, NULL::numeric, NULL, ${r?.precision ?? "not_found"}, NULL::text, false)`;
      });
      // Placed rows get the address location; the rest keep their postal code location
      await prisma.$executeRaw`
        UPDATE "mls_listings" AS m SET
          "latitude" = CASE WHEN v.ok THEN v.lat ELSE m."latitude" END,
          "longitude" = CASE WHEN v.ok THEN v.lng ELSE m."longitude" END,
          "location_source" = CASE WHEN v.ok THEN v.src ELSE m."location_source" END,
          "location_credit" = CASE WHEN v.ok THEN v.credit ELSE m."location_credit" END,
          "location_precision" = v.prec,
          "geocoded_at" = ${now}
        FROM (VALUES ${Prisma.join(rows)}) AS v(id, lat, lng, src, prec, credit, ok)
        WHERE m."id" = v.id`;
      looked += batch.length;
      console.log(`${new Date().toISOString()}  ${looked} looked up, ${placed} placed`);

      const wait = MIN_BATCH_MS - (Date.now() - started);
      if (wait > 0 && looked < max) await new Promise((r) => setTimeout(r, wait));
    }
    const remaining = await prisma.mlsListing.count({ where });
    console.log(`\nDone: ${looked} looked up, ${placed} placed at the street address, ${remaining} still waiting`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
