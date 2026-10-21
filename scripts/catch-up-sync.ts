// One-off catch-up for a large MLS backlog (e.g. after the mirror hasn't synced for weeks).
// Runs the same delta sync as the 15-minute cron, without its per-run page limit, until
// it reaches the present. Safe to stop and re-run: progress is saved after every page.
//
//   PORTAL_DATABASE_URL=... AMPRE_API_TOKEN=... npx tsx scripts/catch-up-sync.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma-node/client";
import { setPrismaClient } from "../src/lib/db";
import { createProvider } from "../src/lib/mls/providers";
import { runDeltaSync } from "../src/lib/mls/sync/engine";

async function main() {
  if (!process.env.AMPRE_API_TOKEN) throw new Error("AMPRE_API_TOKEN is not set");
  if (!process.env.PORTAL_DATABASE_URL) throw new Error("PORTAL_DATABASE_URL is not set");
  setPrismaClient(new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.PORTAL_DATABASE_URL }) }));
  const provider = await createProvider("ampre-reso", {
    apiUrl: process.env.AMPRE_API_URL ?? "https://query.ampre.ca/odata",
    apiToken: process.env.AMPRE_API_TOKEN,
  });

  let total = 0;
  for (;;) {
    // Under the engine's 14-minute stale-run window, so the Worker's cron waits instead of
    // treating a long catch-up pass as stuck and starting its own
    const result = await runDeltaSync(provider, { maxPages: 200, maxMs: 10 * 60 * 1000 });
    if (result.skipped) {
      console.log("Another sync is running; try again in a few minutes.");
      return;
    }
    total += result.totalRecords;
    console.log(
      `${result.totalRecords} listings (${result.inserted} new, ${result.errors} errors) in ${Math.round(result.durationMs / 1000)}s; ${total} so far`
    );
    if (result.caughtUp) break;
  }
  console.log(`Caught up: ${total} listings synced.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
