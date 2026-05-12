import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getFeatureFlags, setFeatureFlag, type FeatureFlags } from "@/lib/feature-flags";

async function requireAgent() {
  const user = await getSessionUser();
  if (!user || (user.role !== "AGENT" && user.role !== "ADMIN")) {
    return null;
  }
  return user;
}

export async function GET() {
  const user = await requireAgent();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const flags = await getFeatureFlags();
  return NextResponse.json(flags);
}

export async function PUT(req: NextRequest) {
  const user = await requireAgent();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const validKeys: (keyof FeatureFlags)[] = [
    "messagingEnabled",
    "transactionsEnabled",
    "ampreFeedLive",
  ];

  for (const key of validKeys) {
    if (typeof body[key] === "boolean") {
      await setFeatureFlag(key, body[key]);
    }
  }

  const flags = await getFeatureFlags();
  return NextResponse.json(flags);
}
