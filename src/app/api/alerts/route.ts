import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { ADDRESS_SELECT, withoutHiddenAddress } from "@/lib/listing-address";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const alerts = await prisma.propertyAlert.findMany({
    where: { userId: auth.user.userId },
    include: {
      savedSearch: { select: { name: true } },
      listing: {
        select: {
          mlsNumber: true,
          listPrice: true,
          ...ADDRESS_SELECT,
          city: true,
          bedrooms: true,
          bathrooms: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return jsonSuccess({ alerts: alerts.map((a) => ({ ...a, listing: withoutHiddenAddress(a.listing) })) });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await req.json();
  const { alertIds } = body as { alertIds?: string[] };

  if (!alertIds || alertIds.length === 0) {
    return jsonError("alertIds array is required", 400);
  }

  await prisma.propertyAlert.updateMany({
    where: { id: { in: alertIds }, userId: auth.user.userId },
    data: { readAt: new Date() },
  });

  return jsonSuccess({ ok: true });
}
