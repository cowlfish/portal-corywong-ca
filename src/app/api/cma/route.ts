import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { NextRequest } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const reports = await prisma.cmaReport.findMany({
    where: { createdByUserId: auth.user.userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { comps: true, soldComps: true } },
    },
  });

  return jsonSuccess({ reports });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, subjectAddress, subjectPropertyType, subjectBedrooms, subjectBathrooms, subjectSqft, subjectListPrice, notes } = body;

  if (!name || typeof name !== "string") {
    return jsonError("Name is required", 400);
  }

  const report = await prisma.cmaReport.create({
    data: {
      createdByUserId: auth.user.userId,
      name,
      subjectAddress: subjectAddress || null,
      subjectPropertyType: subjectPropertyType || null,
      subjectBedrooms: subjectBedrooms != null ? Number(subjectBedrooms) : null,
      subjectBathrooms: subjectBathrooms != null ? Number(subjectBathrooms) : null,
      subjectSqft: subjectSqft != null ? Number(subjectSqft) : null,
      subjectListPrice: subjectListPrice != null ? Number(subjectListPrice) : null,
      notes: notes || null,
    },
  });

  return jsonSuccess({ report }, 201);
}
