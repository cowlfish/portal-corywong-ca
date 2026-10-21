import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { propertyTypeWhere } from "@/lib/mls/property-types";
import { NOT_COMMERCIAL } from "@/lib/mls/listing-scope";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  // Map requests (with bounds) may ask for up to 500 pins; lists page in smaller chunks
  const maxLimit = sp.get("bounds") ? 500 : 50;
  const limit = Math.min(maxLimit, Math.max(1, parseInt(sp.get("limit") || "24", 10)));
  const skip = (page - 1) * limit;

  const sortField = sp.get("sort") || "listDate";
  const sortDir = sp.get("dir") === "asc" ? "asc" : "desc";

  const where: Record<string, unknown> = { status: "ACTIVE" };

  // Sales by default: about a quarter of the feed is monthly rents, which would otherwise
  // fill every low price range. "all" is for callers that want both.
  const transaction = sp.get("transaction") || "sale";
  if (transaction === "sale") where.transactionType = "For Sale";
  else if (transaction === "lease") where.transactionType = { in: ["For Lease", "For Sub-Lease"] };

  // Placeholder prices from listing brokerages ($0, $1 "price on request")
  where.listPrice = { gte: transaction === "lease" ? 100 : 1000 };

  const minPrice = sp.get("minPrice");
  const maxPrice = sp.get("maxPrice");
  if (minPrice || maxPrice) {
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
  const and: unknown[] = [NOT_COMMERCIAL];
  if (propertyType) and.push(propertyTypeWhere(propertyType));

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
    and.push({ OR: [
      { streetName: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { neighbourhood: { contains: q, mode: "insensitive" } },
      { community: { contains: q, mode: "insensitive" } },
      { mlsNumber: { contains: q, mode: "insensitive" } },
      { publicRemarks: { contains: q, mode: "insensitive" } },
    ] });
  }
  if (and.length) where.AND = and;

  const openHouses = sp.get("openHouses");
  if (openHouses === "true") {
    where.openHouses = { some: { startDate: { gte: new Date() } } };
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
  let orderByField = allowedSorts[sortField] || "listDate";
  let orderDir: "asc" | "desc" = sortDir;
  // Days on market is derived from the list date (fewest days = most recently listed)
  if (orderByField === "daysOnMarket") {
    orderByField = "listDate";
    orderDir = sortDir === "asc" ? "desc" : "asc";
  }

  try {
    const [listings, total] = await Promise.all([
      prisma.mlsListing.findMany({
        where,
        // Listings without the sort value go last instead of first (list price is never null)
        orderBy: [
          { [orderByField]: orderByField === "listPrice" ? orderDir : { sort: orderDir, nulls: "last" } },
          { id: "asc" },
        ],
        skip,
        take: limit,
        select: {
          id: true,
          mlsNumber: true,
          listPrice: true,
          status: true,
          propertyType: true,
          propertySubType: true,
          transactionType: true,
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
