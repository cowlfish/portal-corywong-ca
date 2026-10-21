import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/mls/providers";
import { backfillListingDetails, geocodeListings, pruneCommercialListings, runDeltaSync, syncOpenHouses } from "@/lib/mls/sync/engine";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  // Refuse when the secret is unset, so "Bearer undefined" can never match
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.AMPRE_API_TOKEN) {
    return NextResponse.json(
      { error: "AMPRE API token not configured" },
      { status: 503 }
    );
  }

  try {
    const provider = await createProvider("ampre-reso", {
      apiUrl: process.env.AMPRE_API_URL ?? "https://query.ampre.ca/odata",
      apiToken: process.env.AMPRE_API_TOKEN,
    });

    const result = await runDeltaSync(provider);
    // Small backfill each run while older listings are still missing fields
    const backfill = result.skipped ? null : await backfillListingDetails(provider, { maxListings: 500, maxMs: 20_000 });
    const geocode = result.skipped ? null : await geocodeListings({ maxListings: 1000, maxMs: 5_000 });
    // Open houses: once an hour (the first run after the top of the hour)
    const openHouses = !result.skipped && new Date().getUTCMinutes() < 15 ? await syncOpenHouses(provider) : null;
    const commercialPruned = result.skipped ? null : await pruneCommercialListings({ maxListings: 2000 });
    return NextResponse.json({ ok: true, result, backfill, geocode, openHouses, commercialPruned });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
