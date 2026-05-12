import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const listing = await prisma.mlsListing.findFirst({
      where: {
        OR: [{ id }, { mlsNumber: id }],
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
