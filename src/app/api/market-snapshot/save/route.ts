import { prisma } from "@/lib/db";
import { jsonError, jsonSuccess, requireAuth } from "@/lib/api-helpers";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const {
      activeCount,
      avgListPrice,
      medianListPrice,
      avgPricePerSqft,
      avgDaysOnMarket,
      medianDaysOnMarket,
      priceDistribution,
      domDistribution,
      propertyTypeCounts,
      areaCounts,
      filters,
    } = body;

    if (activeCount == null || avgListPrice == null || medianListPrice == null) {
      return jsonError("Missing required snapshot data", 400);
    }

    const shareToken = nanoid(16);

    const snapshot = await prisma.marketSnapshot.create({
      data: {
        snapshotDate: new Date(),
        filters: filters || null,
        activeCount,
        avgListPrice,
        medianListPrice,
        avgPricePerSqft: avgPricePerSqft ?? null,
        avgDaysOnMarket: avgDaysOnMarket ?? null,
        medianDaysOnMarket: medianDaysOnMarket ?? null,
        priceDistribution: priceDistribution ?? null,
        domDistribution: domDistribution ?? null,
        propertyTypeCounts: propertyTypeCounts ?? null,
        areaCounts: areaCounts ?? null,
        shareToken,
        createdById: user.userId,
      },
    });

    return jsonSuccess({
      id: snapshot.id,
      shareToken: snapshot.shareToken,
    }, 201);
  } catch (err) {
    console.error("Save snapshot error:", err);
    return jsonError("Failed to save snapshot", 500);
  }
}
