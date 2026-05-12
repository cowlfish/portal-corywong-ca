import { prisma } from "@/lib/db";
import { jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const tour = await prisma.tour.findUnique({
    where: { shareToken: token },
    include: {
      stops: { orderBy: { sortOrder: "asc" } },
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  if (!tour) return jsonError("Tour not found", 404);

  return jsonSuccess({
    tour: {
      title: tour.title,
      clientName: tour.clientName,
      tourDate: tour.tourDate,
      notes: tour.notes,
      status: tour.status,
      agent: tour.user,
      stops: tour.stops.map((s) => ({
        address: s.address,
        city: s.city,
        province: s.province,
        postalCode: s.postalCode,
        sortOrder: s.sortOrder,
        scheduledTime: s.scheduledTime,
        duration: s.duration,
        notes: s.notes,
        listPrice: s.listPrice,
        bedrooms: s.bedrooms,
        bathrooms: s.bathrooms,
        propertyType: s.propertyType,
        photoUrl: s.photoUrl,
        mlsNumber: s.mlsNumber,
        latitude: s.latitude,
        longitude: s.longitude,
      })),
    },
  });
}
