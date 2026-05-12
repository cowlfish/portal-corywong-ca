import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const report = await prisma.cmaReport.findFirst({
    where: { id, createdByUserId: auth.user.userId },
  });
  if (!report) return jsonError("CMA report not found", 404);

  const body = await request.json();
  const { address, propertyType, bedrooms, bathrooms, sqft, lotSizeSqft, soldPrice, soldDate, listPrice, daysOnMarket, notes } = body;

  if (!address || !soldPrice || !soldDate) {
    return jsonError("address, soldPrice, and soldDate are required", 400);
  }

  const maxOrder = await prisma.cmaSoldComp.aggregate({
    where: { cmaReportId: id },
    _max: { sortOrder: true },
  });

  const soldComp = await prisma.cmaSoldComp.create({
    data: {
      cmaReportId: id,
      address,
      propertyType: propertyType || null,
      bedrooms: bedrooms != null ? Number(bedrooms) : null,
      bathrooms: bathrooms != null ? Number(bathrooms) : null,
      sqft: sqft != null ? Number(sqft) : null,
      lotSizeSqft: lotSizeSqft != null ? Number(lotSizeSqft) : null,
      soldPrice: Number(soldPrice),
      soldDate: new Date(soldDate),
      listPrice: listPrice != null ? Number(listPrice) : null,
      daysOnMarket: daysOnMarket != null ? Number(daysOnMarket) : null,
      notes: notes || null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      source: "MANUAL",
    },
  });

  return jsonSuccess({ soldComp }, 201);
}
