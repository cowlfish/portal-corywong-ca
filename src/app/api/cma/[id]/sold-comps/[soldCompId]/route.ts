import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; soldCompId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id, soldCompId } = await params;

  const report = await prisma.cmaReport.findFirst({
    where: { id, createdByUserId: auth.user.userId },
  });
  if (!report) return jsonError("CMA report not found", 404);

  const body = await request.json();
  const { address, propertyType, bedrooms, bathrooms, sqft, lotSizeSqft, soldPrice, soldDate, listPrice, daysOnMarket, notes } = body;

  const soldComp = await prisma.cmaSoldComp.updateMany({
    where: { id: soldCompId, cmaReportId: id },
    data: {
      ...(address !== undefined && { address }),
      ...(propertyType !== undefined && { propertyType }),
      ...(bedrooms !== undefined && { bedrooms: bedrooms != null ? Number(bedrooms) : null }),
      ...(bathrooms !== undefined && { bathrooms: bathrooms != null ? Number(bathrooms) : null }),
      ...(sqft !== undefined && { sqft: sqft != null ? Number(sqft) : null }),
      ...(lotSizeSqft !== undefined && { lotSizeSqft: lotSizeSqft != null ? Number(lotSizeSqft) : null }),
      ...(soldPrice !== undefined && { soldPrice: Number(soldPrice) }),
      ...(soldDate !== undefined && { soldDate: new Date(soldDate) }),
      ...(listPrice !== undefined && { listPrice: listPrice != null ? Number(listPrice) : null }),
      ...(daysOnMarket !== undefined && { daysOnMarket: daysOnMarket != null ? Number(daysOnMarket) : null }),
      ...(notes !== undefined && { notes }),
    },
  });

  if (soldComp.count === 0) return jsonError("Sold comp not found", 404);
  return jsonSuccess({ updated: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; soldCompId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id, soldCompId } = await params;

  const report = await prisma.cmaReport.findFirst({
    where: { id, createdByUserId: auth.user.userId },
  });
  if (!report) return jsonError("CMA report not found", 404);

  const result = await prisma.cmaSoldComp.deleteMany({
    where: { id: soldCompId, cmaReportId: id },
  });

  if (result.count === 0) return jsonError("Sold comp not found", 404);
  return jsonSuccess({ deleted: true });
}
