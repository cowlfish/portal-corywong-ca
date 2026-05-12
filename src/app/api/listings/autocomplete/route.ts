import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const [addresses, cities, neighbourhoods, mlsMatches] = await Promise.all([
      prisma.mlsListing.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { streetName: { contains: q, mode: "insensitive" } },
            { postalCode: { startsWith: q.toUpperCase() } },
          ],
        },
        select: {
          streetNumber: true,
          streetName: true,
          streetSuffix: true,
          unitNumber: true,
          city: true,
          postalCode: true,
          mlsNumber: true,
        },
        take: 5,
        orderBy: { listDate: "desc" },
      }),
      prisma.mlsListing.groupBy({
        by: ["city"],
        where: {
          status: "ACTIVE",
          city: { contains: q, mode: "insensitive" },
        },
        _count: { city: true },
        orderBy: { _count: { city: "desc" } },
        take: 3,
      }),
      prisma.mlsListing.groupBy({
        by: ["neighbourhood"],
        where: {
          status: "ACTIVE",
          neighbourhood: { contains: q, mode: "insensitive" },
          NOT: { neighbourhood: null },
        },
        _count: { neighbourhood: true },
        orderBy: { _count: { neighbourhood: "desc" } },
        take: 3,
      }),
      prisma.mlsListing.findMany({
        where: {
          status: "ACTIVE",
          mlsNumber: { startsWith: q.toUpperCase() },
        },
        select: {
          mlsNumber: true,
          streetNumber: true,
          streetName: true,
          city: true,
          listPrice: true,
        },
        take: 3,
      }),
    ]);

    const suggestions: { type: string; text: string; value: string; count?: number }[] = [];

    for (const m of mlsMatches) {
      const addr = [m.streetNumber, m.streetName].filter(Boolean).join(" ");
      suggestions.push({
        type: "mls",
        text: `MLS® ${m.mlsNumber} — ${addr}, ${m.city}`,
        value: m.mlsNumber,
      });
    }

    for (const a of addresses) {
      const addr = [a.unitNumber ? `${a.unitNumber} -` : null, a.streetNumber, a.streetName, a.streetSuffix]
        .filter(Boolean)
        .join(" ");
      suggestions.push({
        type: "address",
        text: `${addr}, ${a.city}`,
        value: `${addr}, ${a.city}`,
      });
    }

    for (const c of cities) {
      if (c.city) {
        suggestions.push({
          type: "city",
          text: c.city,
          value: c.city,
          count: c._count.city,
        });
      }
    }

    for (const n of neighbourhoods) {
      if (n.neighbourhood) {
        suggestions.push({
          type: "neighbourhood",
          text: n.neighbourhood,
          value: n.neighbourhood,
          count: n._count.neighbourhood,
        });
      }
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
