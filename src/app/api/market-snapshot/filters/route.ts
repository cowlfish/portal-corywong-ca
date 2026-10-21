import { prisma } from "@/lib/db";
import { jsonError, jsonSuccess, requireAuth } from "@/lib/api-helpers";
import { NOT_COMMERCIAL } from "@/lib/mls/listing-scope";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const [areas, neighbourhoods, propertyTypes] = await Promise.all([
      prisma.mlsListing.findMany({
        where: { status: "ACTIVE", AND: [NOT_COMMERCIAL], area: { not: null } },
        select: { area: true },
        distinct: ["area"],
        orderBy: { area: "asc" },
      }),
      prisma.mlsListing.findMany({
        where: { status: "ACTIVE", AND: [NOT_COMMERCIAL], neighbourhood: { not: null } },
        select: { neighbourhood: true },
        distinct: ["neighbourhood"],
        orderBy: { neighbourhood: "asc" },
      }),
      prisma.mlsListing.findMany({
        where: { status: "ACTIVE", AND: [NOT_COMMERCIAL], propertyType: { not: null } },
        select: { propertyType: true },
        distinct: ["propertyType"],
        orderBy: { propertyType: "asc" },
      }),
    ]);

    return jsonSuccess({
      areas: areas.map((a) => a.area).filter(Boolean),
      neighbourhoods: neighbourhoods.map((n) => n.neighbourhood).filter(Boolean),
      propertyTypes: propertyTypes.map((p) => p.propertyType).filter(Boolean),
    });
  } catch (err) {
    console.error("Filter options error:", err);
    return jsonError("Failed to load filter options", 500);
  }
}
