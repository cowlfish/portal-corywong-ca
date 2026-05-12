import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "24", 10)));
  const skip = (page - 1) * limit;

  const sortField = sp.get("sort") || "listDate";
  const sortDir = sp.get("dir") === "asc" ? "asc" : "desc";

  const where: Record<string, unknown> = { status: "ACTIVE" };

  const minPrice = sp.get("minPrice");
  const maxPrice = sp.get("maxPrice");
  if (minPrice || maxPrice) {
    where.listPrice = {};
    if (minPrice) (where.listPrice as Record<string, unknown>).gte = parseFloat(minPrice);
    if (maxPrice) (where.listPrice as Record<string, unknown>).lte = parseFloat(maxPrice);
  }

  const beds = sp.get("beds");
  if (beds) where.bedrooms = { gte: parseInt(beds, 10) };

  const baths = sp.get("baths");
  if (baths) where.bathrooms = { gte: parseInt(baths, 10) };

  const minSqft = sp.get("minSqft");
  const maxSqft = sp.get("maxSqft");
  if (minSqft || maxSqft) {
    where.sqft = {};
    if (minSqft) (where.sqft as Record<string, unknown>).gte = parseFloat(minSqft);
    if (maxSqft) (where.sqft as Record<string, unknown>).lte = parseFloat(maxSqft);
  }

  const propertyType = sp.get("propertyType");
  if (propertyType) where.propertyType = propertyType;

  const city = sp.get("city");
  if (city) where.city = { contains: city, mode: "insensitive" };

  const neighbourhood = sp.get("neighbourhood");
  if (neighbourhood) where.neighbourhood = { contains: neighbourhood, mode: "insensitive" };

  const community = sp.get("community");
  if (community) where.community = { contains: community, mode: "insensitive" };

  const area = sp.get("area");
  if (area) where.area = { contains: area, mode: "insensitive" };

  const q = sp.get("q");
  if (q) {
    where.OR = [
      { streetName: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { neighbourhood: { contains: q, mode: "insensitive" } },
      { community: { contains: q, mode: "insensitive" } },
      { mlsNumber: { contains: q, mode: "insensitive" } },
      { publicRemarks: { contains: q, mode: "insensitive" } },
    ];
  }

  const bounds = sp.get("bounds");
  if (bounds) {
    const [swLat, swLng, neLat, neLng] = bounds.split(",").map(Number);
    if ([swLat, swLng, neLat, neLng].every((n) => !isNaN(n))) {
      where.latitude = { gte: swLat, lte: neLat };
      where.longitude = { gte: swLng, lte: neLng };
    }
  }

  const allowedSorts: Record<string, string> = {
    listDate: "listDate",
    listPrice: "listPrice",
    bedrooms: "bedrooms",
    sqft: "sqft",
    daysOnMarket: "daysOnMarket",
  };
  const orderByField = allowedSorts[sortField] || "listDate";

  try {
    const [listings, total] = await Promise.all([
      prisma.mlsListing.findMany({
        where,
        orderBy: { [orderByField]: sortDir },
        skip,
        take: limit,
        select: {
          id: true,
          mlsNumber: true,
          listPrice: true,
          status: true,
          propertyType: true,
          propertySubType: true,
          streetNumber: true,
          streetName: true,
          streetSuffix: true,
          unitNumber: true,
          city: true,
          province: true,
          neighbourhood: true,
          community: true,
          area: true,
          latitude: true,
          longitude: true,
          bedrooms: true,
          bedroomsPlus: true,
          bathrooms: true,
          bathroomsHalf: true,
          sqft: true,
          sqftRangeMin: true,
          sqftRangeMax: true,
          yearBuilt: true,
          parkingSpaces: true,
          garageSpaces: true,
          maintenanceFee: true,
          listDate: true,
          daysOnMarket: true,
          virtualTourUrl: true,
          publicRemarks: true,
          listOfficeName: true,
          photos: {
            take: 1,
            orderBy: { displayOrder: "asc" },
            select: { photoUrl: true },
          },
        },
      }),
      prisma.mlsListing.count({ where }),
    ]);

    return NextResponse.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Listing search error:", error);
    return NextResponse.json({ error: "Failed to search listings" }, { status: 500 });
  }
}
