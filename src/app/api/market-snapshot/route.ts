import { prisma } from "@/lib/db";
import { jsonError, jsonSuccess, requireAuth } from "@/lib/api-helpers";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const url = new URL(request.url);
  const area = url.searchParams.get("area");
  const neighbourhood = url.searchParams.get("neighbourhood");
  const propertyType = url.searchParams.get("propertyType");
  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");
  const minBeds = url.searchParams.get("minBeds");
  const minBaths = url.searchParams.get("minBaths");

  const where: Prisma.MlsListingWhereInput = { status: "ACTIVE" };
  if (area) where.area = area;
  if (neighbourhood) where.neighbourhood = neighbourhood;
  if (propertyType) where.propertyType = propertyType;
  if (minPrice || maxPrice) {
    where.listPrice = {};
    if (minPrice) where.listPrice.gte = new Prisma.Decimal(minPrice);
    if (maxPrice) where.listPrice.lte = new Prisma.Decimal(maxPrice);
  }
  if (minBeds) where.bedrooms = { gte: parseInt(minBeds) };
  if (minBaths) where.bathrooms = { gte: parseInt(minBaths) };

  try {
    const listings = await prisma.mlsListing.findMany({
      where,
      select: {
        listPrice: true,
        sqft: true,
        daysOnMarket: true,
        propertyType: true,
        area: true,
        neighbourhood: true,
        bedrooms: true,
        bathrooms: true,
        city: true,
      },
    });

    const count = listings.length;
    if (count === 0) {
      return jsonSuccess({
        activeCount: 0,
        avgListPrice: 0,
        medianListPrice: 0,
        avgPricePerSqft: null,
        avgDaysOnMarket: null,
        medianDaysOnMarket: null,
        priceDistribution: [],
        domDistribution: [],
        propertyTypeCounts: [],
        areaCounts: [],
        filters: { area, neighbourhood, propertyType, minPrice, maxPrice, minBeds, minBaths },
        generatedAt: new Date().toISOString(),
      });
    }

    const prices = listings
      .map((l) => Number(l.listPrice))
      .sort((a, b) => a - b);
    const avgListPrice = prices.reduce((s, p) => s + p, 0) / count;
    const medianListPrice = median(prices);

    const withSqft = listings.filter((l) => l.sqft && Number(l.sqft) > 0);
    const avgPricePerSqft =
      withSqft.length > 0
        ? withSqft.reduce((s, l) => s + Number(l.listPrice) / Number(l.sqft!), 0) / withSqft.length
        : null;

    const doms = listings
      .filter((l) => l.daysOnMarket != null)
      .map((l) => l.daysOnMarket!);
    const avgDaysOnMarket = doms.length > 0 ? doms.reduce((s, d) => s + d, 0) / doms.length : null;
    const medianDaysOnMarket = doms.length > 0 ? median(doms.sort((a, b) => a - b)) : null;

    const priceBands = [
      { label: "Under $500K", min: 0, max: 500000 },
      { label: "$500K–$750K", min: 500000, max: 750000 },
      { label: "$750K–$1M", min: 750000, max: 1000000 },
      { label: "$1M–$1.5M", min: 1000000, max: 1500000 },
      { label: "$1.5M–$2M", min: 1500000, max: 2000000 },
      { label: "$2M–$3M", min: 2000000, max: 3000000 },
      { label: "$3M+", min: 3000000, max: Infinity },
    ];
    const priceDistribution = priceBands.map((band) => ({
      label: band.label,
      count: prices.filter((p) => p >= band.min && p < band.max).length,
    }));

    const domBands = [
      { label: "0–7 days", min: 0, max: 8 },
      { label: "8–14 days", min: 8, max: 15 },
      { label: "15–30 days", min: 15, max: 31 },
      { label: "31–60 days", min: 31, max: 61 },
      { label: "61–90 days", min: 61, max: 91 },
      { label: "90+ days", min: 91, max: Infinity },
    ];
    const domDistribution = domBands.map((band) => ({
      label: band.label,
      count: doms.filter((d) => d >= band.min && d < band.max).length,
    }));

    const typeCounts = new Map<string, number>();
    for (const l of listings) {
      const t = l.propertyType || "Unknown";
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
    }
    const propertyTypeCounts = [...typeCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const areaCntMap = new Map<string, number>();
    for (const l of listings) {
      const a = l.area || l.city || "Unknown";
      areaCntMap.set(a, (areaCntMap.get(a) || 0) + 1);
    }
    const areaCounts = [...areaCntMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return jsonSuccess({
      activeCount: count,
      avgListPrice: Math.round(avgListPrice),
      medianListPrice: Math.round(medianListPrice),
      avgPricePerSqft: avgPricePerSqft ? Math.round(avgPricePerSqft) : null,
      avgDaysOnMarket: avgDaysOnMarket ? Math.round(avgDaysOnMarket * 10) / 10 : null,
      medianDaysOnMarket: medianDaysOnMarket ? Math.round(medianDaysOnMarket) : null,
      priceDistribution,
      domDistribution,
      propertyTypeCounts,
      areaCounts,
      filters: { area, neighbourhood, propertyType, minPrice, maxPrice, minBeds, minBaths },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Market snapshot error:", err);
    return jsonError("Failed to compute market snapshot", 500);
  }
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
