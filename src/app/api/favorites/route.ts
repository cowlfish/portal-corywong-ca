import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const favorites = await prisma.favorite.findMany({
    where: { userId: auth.user.userId },
    include: {
      listing: {
        select: {
          id: true,
          mlsNumber: true,
          status: true,
          listPrice: true,
          streetNumber: true,
          streetName: true,
          city: true,
          bedrooms: true,
          bathrooms: true,
          sqft: true,
          propertyType: true,
          photos: {
            take: 1,
            orderBy: { displayOrder: "asc" },
            select: { photoUrl: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonSuccess({ favorites });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { listingId, notes } = await req.json();
  if (!listingId) return jsonError("Listing ID is required", 400);

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_listingId: {
        userId: auth.user.userId,
        listingId,
      },
    },
    update: { notes: notes ?? null },
    create: {
      userId: auth.user.userId,
      listingId,
      notes: notes ?? null,
    },
  });

  return jsonSuccess({ favorite }, 201);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");
  if (!listingId) return jsonError("Listing ID is required", 400);

  await prisma.favorite.deleteMany({
    where: { userId: auth.user.userId, listingId },
  });

  return jsonSuccess({ ok: true });
}
