import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

async function getOwnedReport(userId: string, reportId: string) {
  return prisma.cmaReport.findFirst({
    where: { id: reportId, createdByUserId: userId },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const report = await prisma.cmaReport.findFirst({
    where: { id, createdByUserId: auth.user.userId },
    include: {
      comps: {
        orderBy: { sortOrder: "asc" },
        include: {
          listing: {
            include: { photos: { take: 1, orderBy: { displayOrder: "asc" } } },
          },
        },
      },
      soldComps: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!report) return jsonError("CMA report not found", 404);
  return jsonSuccess({ report });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const existing = await getOwnedReport(auth.user.userId, id);
  if (!existing) return jsonError("CMA report not found", 404);

  const body = await request.json();
  const { name, subjectAddress, subjectPropertyType, subjectBedrooms, subjectBathrooms, subjectSqft, subjectListPrice, notes, status } = body;

  const report = await prisma.cmaReport.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(subjectAddress !== undefined && { subjectAddress }),
      ...(subjectPropertyType !== undefined && { subjectPropertyType }),
      ...(subjectBedrooms !== undefined && { subjectBedrooms: subjectBedrooms != null ? Number(subjectBedrooms) : null }),
      ...(subjectBathrooms !== undefined && { subjectBathrooms: subjectBathrooms != null ? Number(subjectBathrooms) : null }),
      ...(subjectSqft !== undefined && { subjectSqft: subjectSqft != null ? Number(subjectSqft) : null }),
      ...(subjectListPrice !== undefined && { subjectListPrice: subjectListPrice != null ? Number(subjectListPrice) : null }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    },
  });

  return jsonSuccess({ report });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const existing = await getOwnedReport(auth.user.userId, id);
  if (!existing) return jsonError("CMA report not found", 404);

  await prisma.cmaReport.delete({ where: { id } });
  return jsonSuccess({ deleted: true });
}
