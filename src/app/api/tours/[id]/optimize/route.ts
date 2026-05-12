import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

interface GeoStop {
  id: string;
  lat: number;
  lng: number;
  sortOrder: number;
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nearestNeighborRoute(stops: GeoStop[]): GeoStop[] {
  if (stops.length <= 2) return stops;
  const remaining = [...stops];
  const route: GeoStop[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(
        { lat: last.lat, lng: last.lng },
        { lat: remaining[i].lat, lng: remaining[i].lng }
      );
      if (d < minDist) {
        minDist = d;
        nearest = i;
      }
    }
    route.push(remaining.splice(nearest, 1)[0]);
  }
  return route;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const tour = await prisma.tour.findFirst({
    where: { id, userId: auth.user.userId },
    include: { stops: { orderBy: { sortOrder: "asc" } } },
  });
  if (!tour) return jsonError("Tour not found", 404);

  const geoStops = tour.stops
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({
      id: s.id,
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      sortOrder: s.sortOrder,
    }));

  const nonGeoStops = tour.stops.filter((s) => !s.latitude || !s.longitude);

  if (geoStops.length < 2) {
    return jsonError("Need at least 2 stops with coordinates to optimize", 400);
  }

  const optimized = nearestNeighborRoute(geoStops);

  const updates = optimized.map((stop, idx) =>
    prisma.tourStop.update({
      where: { id: stop.id },
      data: { sortOrder: idx },
    })
  );
  const nonGeoUpdates = nonGeoStops.map((stop, idx) =>
    prisma.tourStop.update({
      where: { id: stop.id },
      data: { sortOrder: optimized.length + idx },
    })
  );

  await prisma.$transaction([...updates, ...nonGeoUpdates]);

  let totalDistance = 0;
  for (let i = 1; i < optimized.length; i++) {
    totalDistance += haversineDistance(optimized[i - 1], optimized[i]);
  }

  const updatedTour = await prisma.tour.findUnique({
    where: { id },
    include: { stops: { orderBy: { sortOrder: "asc" } } },
  });

  return jsonSuccess({
    tour: updatedTour,
    optimization: {
      totalDistanceKm: Math.round(totalDistance * 10) / 10,
      stopsOptimized: optimized.length,
      stopsWithoutCoordinates: nonGeoStops.length,
    },
  });
}
