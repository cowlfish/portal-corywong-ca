import { NextRequest, NextResponse } from "next/server";
import { createProvider } from "@/lib/mls/providers";
import { runDeltaSync } from "@/lib/mls/sync/engine";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
    return NextResponse.json({ ok: true, result });
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
