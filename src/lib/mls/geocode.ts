import { getCloudflareContext } from "@opennextjs/cloudflare";

// The TRREB IDX feed has no coordinates (the fields exist but are withheld), so listings are
// placed at their postal code's centre using GeoNames data (CC BY 4.0) shipped as static
// files in public/geo/postal/{FSA}.json. In cities a postal code is about one block.

type Shard = Record<string, [number, number]>;

export interface Location {
  latitude: number;
  longitude: number;
  // "postal": the full code matched; "area": only its first three characters (FSA)
  precision: "postal" | "area";
}

const shards = new Map<string, Shard | null>();

async function loadShard(fsa: string): Promise<Shard | null> {
  if (shards.has(fsa)) return shards.get(fsa)!;
  let shard: Shard | null = null;
  try {
    let assets: Fetcher | undefined;
    try {
      assets = getCloudflareContext().env.ASSETS;
    } catch {
      assets = undefined;
    }
    if (assets) {
      const res = await assets.fetch(new Request(`https://assets.local/geo/postal/${fsa}.json`));
      if (res.ok) shard = (await res.json()) as Shard;
    } else {
      // Node scripts (catch-up sync): read the same files from disk
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      shard = JSON.parse(await readFile(join(process.cwd(), "public/geo/postal", `${fsa}.json`), "utf8")) as Shard;
    }
  } catch {
    shard = null;
  }
  shards.set(fsa, shard);
  return shard;
}

export async function locatePostalCode(postalCode: string | null | undefined): Promise<Location | null> {
  const code = (postalCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(code)) return null;
  const fsa = code.slice(0, 3);
  const shard = await loadShard(fsa);
  if (!shard) return null;

  const exact = shard[code.slice(3)];
  if (exact) return { latitude: exact[0], longitude: exact[1], precision: "postal" };

  // New or unlisted code: centre of its forward sortation area
  const points = Object.values(shard);
  if (points.length === 0) return null;
  const latitude = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const longitude = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  return { latitude: Number(latitude.toFixed(4)), longitude: Number(longitude.toFixed(4)), precision: "area" };
}
