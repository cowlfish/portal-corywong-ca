import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NOT_COMMERCIAL } from "@/lib/mls/listing-scope";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const listing = await prisma.mlsListing.findFirst({
      where: {
        OR: [{ id }, { mlsNumber: id }],
        // Active only: sold/expired listings must not be published (RECO 5.4, TRREB IDX)
        status: "ACTIVE",
        AND: [NOT_COMMERCIAL],
      },
      include: {
        photos: { orderBy: { displayOrder: "asc" } },
        rooms: { orderBy: { roomType: "asc" } },
        openHouses: {
          where: { startDate: { gte: new Date() } },
          orderBy: { startDate: "asc" },
        },
        priceHistory: { orderBy: { changeDate: "desc" } },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error("Listing detail error:", error);
    return NextResponse.json({ error: "Failed to fetch listing" }, { status: 500 });
  }
}
