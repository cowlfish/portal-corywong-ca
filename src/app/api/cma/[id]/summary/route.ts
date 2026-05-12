import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";

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

  const activeComps = report.comps.map((c) => c.listing);
  const soldComps = report.soldComps;

  const activePrices = activeComps.map((l) => Number(l.listPrice));
  const activeSqfts = activeComps.map((l) => Number(l.sqft || 0)).filter((s) => s > 0);
  const activeDom = activeComps.map((l) => l.daysOnMarket ?? 0);
  const activePpsf = activeComps
    .filter((l) => l.sqft && Number(l.sqft) > 0)
    .map((l) => Number(l.listPrice) / Number(l.sqft));

  const soldPrices = soldComps.map((s) => Number(s.soldPrice));
  const soldSqfts = soldComps.map((s) => Number(s.sqft || 0)).filter((s) => s > 0);
  const soldDom = soldComps.map((s) => s.daysOnMarket ?? 0);
  const soldPpsf = soldComps
    .filter((s) => s.sqft && Number(s.sqft) > 0)
    .map((s) => Number(s.soldPrice) / Number(s.sqft));

  function stats(values: number[]) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length),
      median: sorted.length % 2 === 0
        ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
        : sorted[Math.floor(sorted.length / 2)],
      count: sorted.length,
    };
  }

  return jsonSuccess({
    report: {
      id: report.id,
      name: report.name,
      status: report.status,
      subjectAddress: report.subjectAddress,
      subjectPropertyType: report.subjectPropertyType,
      subjectBedrooms: report.subjectBedrooms,
      subjectBathrooms: report.subjectBathrooms,
      subjectSqft: report.subjectSqft,
      subjectListPrice: report.subjectListPrice,
    },
    activeComps: {
      count: activeComps.length,
      price: stats(activePrices),
      pricePerSqft: stats(activePpsf),
      daysOnMarket: stats(activeDom),
      sqft: stats(activeSqfts),
      listings: activeComps,
    },
    soldComps: {
      count: soldComps.length,
      price: stats(soldPrices),
      pricePerSqft: stats(soldPpsf),
      daysOnMarket: stats(soldDom),
      sqft: stats(soldSqfts),
      entries: soldComps,
    },
  });
}
