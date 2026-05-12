import { prisma } from "./prisma";

export interface FeatureFlags {
  messagingEnabled: boolean;
  transactionsEnabled: boolean;
  ampreFeedLive: boolean;
}

const DEFAULTS: FeatureFlags = {
  messagingEnabled: false,
  transactionsEnabled: false,
  ampreFeedLive: false,
};

const ENV_MAP: Record<keyof FeatureFlags, string> = {
  messagingEnabled: "NEXT_PUBLIC_FEATURE_MESSAGING",
  transactionsEnabled: "NEXT_PUBLIC_FEATURE_TRANSACTIONS",
  ampreFeedLive: "NEXT_PUBLIC_AMPRE_FEED_LIVE",
};

const DB_KEY_MAP: Record<keyof FeatureFlags, string> = {
  messagingEnabled: "feature_messaging",
  transactionsEnabled: "feature_transactions",
  ampreFeedLive: "ampre_feed_live",
};

function envFlag(key: keyof FeatureFlags): boolean | null {
  const val = process.env[ENV_MAP[key]];
  if (val === "true") return true;
  if (val === "false") return false;
  return null;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  let dbFlags: Record<string, string> = {};
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: Object.values(DB_KEY_MAP) } },
    });
    for (const row of rows) {
      dbFlags[row.key] = row.value;
    }
  } catch {
    // Table may not exist yet — fall through to env/defaults
  }

  const flags: FeatureFlags = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS) as (keyof FeatureFlags)[]) {
    const dbVal = dbFlags[DB_KEY_MAP[k]];
    if (dbVal === "true") {
      flags[k] = true;
    } else if (dbVal === "false") {
      flags[k] = false;
    } else {
      const env = envFlag(k);
      if (env !== null) flags[k] = env;
    }
  }
  return flags;
}

export async function setFeatureFlag(
  key: keyof FeatureFlags,
  value: boolean
): Promise<void> {
  const dbKey = DB_KEY_MAP[key];
  await prisma.siteSetting.upsert({
    where: { key: dbKey },
    update: { value: String(value) },
    create: { key: dbKey, value: String(value) },
  });
}

export function getFeatureFlagsFromEnv(): FeatureFlags {
  const flags: FeatureFlags = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS) as (keyof FeatureFlags)[]) {
    const env = envFlag(k);
    if (env !== null) flags[k] = env;
  }
  return flags;
}
