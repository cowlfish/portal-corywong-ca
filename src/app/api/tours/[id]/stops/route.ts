import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  const tour = await prisma.tour.findFirst({
    where: { id, userId: auth.user.userId },
  });
  if (!tour) return jsonError("Tour not found", 404);

  const body = await req.json();
  const { listingId, address, city, province, postalCode, latitude, longitude, notes, scheduledTime, duration } = body;

  let stopData: Record<string, unknown> = {
    tourId: id,
    notes: notes || null,
    scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
    duration: duration || 30,
  };

  if (listingId) {
    const listing = await prisma.mlsListing.findUnique({
      where: { id: listingId },
      include: {
        photos: { take: 1, orderBy: { displayOrder: "asc" }, select: { photoUrl: true } },
      },
    });
    if (!listing) return jsonError("Listing not found", 400);

    stopData = {
      ...stopData,
      listingId: listing.id,
      address: [listing.streetNumber, listing.streetName, listing.streetSuffix].filter(Boolean).join(" "),
      city: listing.city,
      province: listing.province,
      postalCode: listing.postalCode,
      latitude: listing.latitude,
      longitude: listing.longitude,
      listPrice: listing.listPrice,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      propertyType: listing.propertyType,
      photoUrl: listing.photos[0]?.photoUrl || null,
      mlsNumber: listing.mlsNumber,
    };
  } else {
    if (!address || typeof address !== "string") {
      return jsonError("Address is required for manual stops", 400);
    }
    stopData = {
      ...stopData,
      address,
      city: city || null,
      province: province || null,
      postalCode: postalCode || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    };
  }

  const maxOrder = await prisma.tourStop.aggregate({
    where: { tourId: id },
    _max: { sortOrder: true },
  });
  stopData.sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const stop = await prisma.tourStop.create({ data: stopData as Parameters<typeof prisma.tourStop.create>[0]["data"] });
  return jsonSuccess({ stop }, 201);
}
