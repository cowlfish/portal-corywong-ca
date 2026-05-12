import { prisma } from "@/lib/db";
import { requireAuth, jsonSuccess, jsonError } from "@/lib/api-helpers";
import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const report = await prisma.cmaReport.findFirst({
    where: { id, createdByUserId: auth.user.userId },
  });
  if (!report) return jsonError("CMA report not found", 404);

  const url = request.nextUrl;
  const search = url.searchParams;

  const where: Prisma.MlsListingWhereInput = { status: "ACTIVE" };

  const city = search.get("city");
  if (city) where.city = { contains: city, mode: "insensitive" };

  const community = search.get("community");
  if (community) where.community = { contains: community, mode: "insensitive" };

  const area = search.get("area");
  if (area) where.area = { contains: area, mode: "insensitive" };

  const neighbourhood = search.get("neighbourhood");
  if (neighbourhood) where.neighbourhood = { contains: neighbourhood, mode: "insensitive" };

  const propertyType = search.get("propertyType");
  if (propertyType) where.propertyType = propertyType;

  const bedsMin = search.get("bedsMin");
  const bedsMax = search.get("bedsMax");
  if (bedsMin || bedsMax) {
    where.bedrooms = {};
    if (bedsMin) where.bedrooms.gte = Number(bedsMin);
    if (bedsMax) where.bedrooms.lte = Number(bedsMax);
  }

  const bathsMin = search.get("bathsMin");
  const bathsMax = search.get("bathsMax");
  if (bathsMin || bathsMax) {
    where.bathrooms = {};
    if (bathsMin) where.bathrooms.gte = Number(bathsMin);
    if (bathsMax) where.bathrooms.lte = Number(bathsMax);
  }

  const priceMin = search.get("priceMin");
  const priceMax = search.get("priceMax");
  if (priceMin || priceMax) {
    where.listPrice = {};
    if (priceMin) where.listPrice.gte = Number(priceMin);
    if (priceMax) where.listPrice.lte = Number(priceMax);
  }

  const sqftMin = search.get("sqftMin");
  const sqftMax = search.get("sqftMax");
  if (sqftMin || sqftMax) {
    where.sqft = {};
    if (sqftMin) where.sqft.gte = Number(sqftMin);
    if (sqftMax) where.sqft.lte = Number(sqftMax);
  }

  const buildingName = search.get("buildingName");
  if (buildingName) {
    where.publicRemarks = { contains: buildingName, mode: "insensitive" };
  }

  const limit = Math.min(Number(search.get("limit") || 50), 100);
  const offset = Number(search.get("offset") || 0);

  const [listings, total] = await Promise.all([
    prisma.mlsListing.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { listPrice: "asc" },
      include: { photos: { take: 1, orderBy: { displayOrder: "asc" } } },
    }),
    prisma.mlsListing.count({ where }),
  ]);

  const selectedIds = new Set(
    (
      await prisma.cmaComp.findMany({
        where: { cmaReportId: id },
        select: { listingId: true },
      })
    ).map((c) => c.listingId)
  );

  const results = listings.map((l) => ({
    ...l,
    selected: selectedIds.has(l.id),
  }));

  return jsonSuccess({ listings: results, total, limit, offset });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const report = await prisma.cmaReport.findFirst({
    where: { id, createdByUserId: auth.user.userId },
  });
  if (!report) return jsonError("CMA report not found", 404);

  const { listingId, notes } = await request.json();
  if (!listingId) return jsonError("listingId is required", 400);

  const listing = await prisma.mlsListing.findUnique({ where: { id: listingId } });
  if (!listing) return jsonError("Listing not found", 404);

  const maxOrder = await prisma.cmaComp.aggregate({
    where: { cmaReportId: id },
    _max: { sortOrder: true },
  });

  const comp = await prisma.cmaComp.upsert({
    where: { cmaReportId_listingId: { cmaReportId: id, listingId } },
    create: {
      cmaReportId: id,
      listingId,
      notes: notes || null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    update: { notes: notes || null },
    include: {
      listing: {
        include: { photos: { take: 1, orderBy: { displayOrder: "asc" } } },
      },
    },
  });

  return jsonSuccess({ comp }, 201);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { id } = await params;

  const report = await prisma.cmaReport.findFirst({
    where: { id, createdByUserId: auth.user.userId },
  });
  if (!report) return jsonError("CMA report not found", 404);

  const { listingId } = await request.json();
  if (!listingId) return jsonError("listingId is required", 400);

  await prisma.cmaComp.deleteMany({
    where: { cmaReportId: id, listingId },
  });

  return jsonSuccess({ deleted: true });
}
