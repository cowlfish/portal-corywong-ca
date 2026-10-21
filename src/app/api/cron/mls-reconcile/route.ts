import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/mls/providers";
import { backfillListingDetails, geocodeListings, pruneRemovedListings, reconcileRemovedListings } from "@/lib/mls/sync/engine";

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

    const result = await reconcileRemovedListings(provider);
    const pruned = await pruneRemovedListings();
    // The daily trigger gets 15 minutes, so it does the bulk of any backfill
    const backfill = await backfillListingDetails(provider, { maxListings: 50_000, maxMs: 8 * 60 * 1000 });
    const geocode = await geocodeListings({ maxListings: 150_000, maxMs: 4 * 60 * 1000 });
    return NextResponse.json({ ok: true, result: { ...result, pruned, backfill, geocode } });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Reconcile failed",
      },
      { status: 500 }
    );
  }
}
