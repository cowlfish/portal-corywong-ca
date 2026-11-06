import { getCloudflareContext } from "@opennextjs/cloudflare";

// The TRREB IDX feed has no coordinates (the fields exist but are withheld), so listings are
// placed at their postal code's centre as soon as they sync, using GeoNames data (CC BY 4.0)
// shipped as static files in public/geo/postal/{FSA}.json. In cities a postal code is about one
// block. Geocodio then moves each pin to the street address (geocodeAddresses below).

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

// areaOnly: skip the full code and use the area centre, for listings whose seller hasn't allowed
// the address to be shown (a full postal code is about one block in a city)
export async function locatePostalCode(
  postalCode: string | null | undefined,
  { areaOnly = false } = {}
): Promise<Location | null> {
  const code = (postalCode ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(code)) return null;
  const fsa = code.slice(0, 3);
  const shard = await loadShard(fsa);
  if (!shard) return null;

  const area = shapeOf(fsa, shard);
  if (!area) return null;

  const exact = areaOnly ? undefined : shard[code.slice(3)];
  // GeoNames misplaces a few hundred codes (M4R 0A2, a Toronto condo, sits near Owen Sound;
  // some are in the Yukon). A point far outside its area's usual spread is ignored.
  if (exact && distanceKm(exact, area.centre) <= area.maxKm) {
    return { latitude: exact[0], longitude: exact[1], precision: "postal" };
  }

  // New, unlisted or misplaced code: centre of its forward sortation area
  return { latitude: area.centre[0], longitude: area.centre[1], precision: "area" };
}

interface AreaShape {
  // Median point: unlike the mean, a few misplaced codes can't drag it away
  centre: [number, number];
  // How far a code may sit from the centre: twice the distance that 95% of the area's codes
  // fall within, and at least 10 km (rural areas are large)
  maxKm: number;
}

const shapes = new Map<string, AreaShape | null>();

function shapeOf(fsa: string, shard: Shard): AreaShape | null {
  if (shapes.has(fsa)) return shapes.get(fsa)!;
  const points = Object.values(shard);
  let shape: AreaShape | null = null;
  if (points.length > 0) {
    const median = (xs: number[]) => {
      const s = [...xs].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    };
    const centre: [number, number] = [
      Number(median(points.map((p) => p[0])).toFixed(4)),
      Number(median(points.map((p) => p[1])).toFixed(4)),
    ];
    const distances = points.map((p) => distanceKm(p, centre)).sort((a, b) => a - b);
    const p95 = distances[Math.min(distances.length - 1, Math.floor(distances.length * 0.95))];
    shape = { centre, maxKm: Math.max(10, 2 * p95) };
  }
  shapes.set(fsa, shape);
  return shape;
}

// Close enough at Ontario's latitudes for comparing distances within one postal area
function distanceKm(a: [number, number], b: [number, number]): number {
  const kmPerDegLng = 111 * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * kmPerDegLng);
}

// Street-address geocoding through Geocodio (geocod.io). Results may be stored permanently and
// shown on any map. Free for 2,500 lookups a day; see GEOCODIO_DAILY_LIMIT in sync/engine.ts.

export interface AddressLocation {
  latitude: number;
  longitude: number;
  // Geocodio accuracy_type, e.g. "rooftop", "range_interpolation", "street_center", "place"
  precision: string;
  // Whether it's precise enough to replace the postal code location
  usable: boolean;
  // Address data credit, e.g. "City of Toronto (Open Government Licence – Toronto ...)"
  credit: string | null;
}

// Precise enough to beat a postal code centre. "street_center" and "place" can be further off
// than the postal code, especially on long rural roads.
const USABLE_PRECISION = new Set(["rooftop", "point", "nearest_rooftop_match", "range_interpolation", "intersection"]);
const MIN_ACCURACY = 0.8;

interface GeocodioResult {
  location: { lat: number; lng: number };
  accuracy: number;
  accuracy_type: string;
  source?: string;
}

// Looks up to a few hundred addresses in one request. Returns null for each address Geocodio
// couldn't place; throws if the request itself fails (bad key, out of credit), so the caller
// can stop without marking listings as looked up.
export async function geocodeAddresses(
  addresses: Record<string, string>,
  apiKey: string
): Promise<Record<string, AddressLocation | null>> {
  const res = await fetch("https://api.geocod.io/v2.1/geocode?country=CA", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(addresses),
  });
  if (!res.ok) throw new Error(`Geocodio ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as {
    results: Record<string, { response?: { results?: GeocodioResult[] } }>;
  };

  const out: Record<string, AddressLocation | null> = {};
  for (const id of Object.keys(addresses)) {
    const best = body.results?.[id]?.response?.results?.[0];
    if (!best) {
      out[id] = null;
      continue;
    }
    out[id] = {
      latitude: best.location.lat,
      longitude: best.location.lng,
      precision: best.accuracy_type,
      usable: USABLE_PRECISION.has(best.accuracy_type) && best.accuracy >= MIN_ACCURACY,
      // Drop Geocodio's note that the postal code came from the query
      credit: best.source?.split(/;\s*Postal code provided/)[0].trim() || null,
    };
  }
  return out;
}
