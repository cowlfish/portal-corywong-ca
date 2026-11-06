// One-off: marks listings that have left the feed (sold, leased, expired, withdrawn) as DELETED,
// the same as the daily reconcile in src/lib/mls/sync/engine.ts. Written for 2026-11-06, when the
// daily job had been refusing to run and ~72k stale listings were still public. Marks, never
// deletes rows, so it can be undone. Safe to re-run.
//
//   npx tsx scripts/reconcile-once.ts --dry-run   # counts only, writes nothing
//   npx tsx scripts/reconcile-once.ts             # PORTAL_DATABASE_URL and AMPRE_API_TOKEN from .env/.dev.vars
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma-node/client";
import { AmpreResoProvider } from "../src/lib/mls/providers/ampre-reso";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!process.env.AMPRE_API_TOKEN) throw new Error("AMPRE_API_TOKEN is not set");
  if (!process.env.PORTAL_DATABASE_URL) throw new Error("PORTAL_DATABASE_URL is not set");
  const provider = new AmpreResoProvider();
  await provider.initialize({
    apiUrl: process.env.AMPRE_API_URL ?? "https://query.ampre.ca/odata",
    apiToken: process.env.AMPRE_API_TOKEN,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.PORTAL_DATABASE_URL }) });
  try {
    const feedKeys = await provider.fetchAllListingKeys();
    if (feedKeys.size < 10_000) throw new Error(`Feed returned only ${feedKeys.size} listings`);
    const active = await prisma.mlsListing.findMany({ where: { status: "ACTIVE" }, select: { listingKey: true } });
    const gone = active.map((l) => l.listingKey).filter((k) => !feedKeys.has(k));
    console.log(`feed ${feedKeys.size}, active in database ${active.length}, not in feed ${gone.length}`);
    if (dryRun) return;
    const now = new Date();
    let removed = 0;
    for (let i = 0; i < gone.length; i += 1000) {
      const { count } = await prisma.mlsListing.updateMany({
        where: { listingKey: { in: gone.slice(i, i + 1000) }, status: "ACTIVE" },
        data: { status: "DELETED", statusChangeAt: now },
      });
      removed += count;
    }
    console.log(`marked ${removed} as removed (statusChangeAt ${now.toISOString()})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
