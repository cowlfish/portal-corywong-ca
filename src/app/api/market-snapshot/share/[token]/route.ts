import { prisma } from "@/lib/db";
import { jsonError, jsonSuccess } from "@/lib/api-helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const snapshot = await prisma.marketSnapshot.findUnique({
      where: { shareToken: token },
    });

    if (!snapshot) {
      return jsonError("Snapshot not found", 404);
    }

    return jsonSuccess({
      snapshotDate: snapshot.snapshotDate,
      filters: snapshot.filters,
      activeCount: snapshot.activeCount,
      avgListPrice: Number(snapshot.avgListPrice),
      medianListPrice: Number(snapshot.medianListPrice),
      avgPricePerSqft: snapshot.avgPricePerSqft ? Number(snapshot.avgPricePerSqft) : null,
      avgDaysOnMarket: snapshot.avgDaysOnMarket ? Number(snapshot.avgDaysOnMarket) : null,
      medianDaysOnMarket: snapshot.medianDaysOnMarket,
      priceDistribution: snapshot.priceDistribution,
      domDistribution: snapshot.domDistribution,
      propertyTypeCounts: snapshot.propertyTypeCounts,
      areaCounts: snapshot.areaCounts,
    });
  } catch (err) {
    console.error("Share snapshot error:", err);
    return jsonError("Failed to load snapshot", 500);
  }
}
