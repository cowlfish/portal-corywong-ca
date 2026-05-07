import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess } from "@/lib/api-helpers";

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
          streetNumber: true,
          streetName: true,
          city: true,
          bedrooms: true,
          bathrooms: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return jsonSuccess({ alerts });
}
