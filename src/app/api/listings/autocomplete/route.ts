import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NOT_COMMERCIAL } from "@/lib/mls/listing-scope";
import { ADDRESS_SELECT, ADDRESS_SHOWN, streetAddress } from "@/lib/listing-address";

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
          AND: [NOT_COMMERCIAL],
          // Never suggest a withheld address by its street or postal code
          ...ADDRESS_SHOWN,
          OR: [
            { streetName: { contains: q, mode: "insensitive" } },
            { postalCode: { startsWith: q.toUpperCase() } },
          ],
        },
        select: {
          ...ADDRESS_SELECT,
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
          AND: [NOT_COMMERCIAL],
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
          AND: [NOT_COMMERCIAL],
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
          AND: [NOT_COMMERCIAL],
          mlsNumber: { startsWith: q.toUpperCase() },
        },
        select: {
          mlsNumber: true,
          ...ADDRESS_SELECT,
          city: true,
          listPrice: true,
        },
        take: 3,
      }),
    ]);

    const suggestions: { type: string; text: string; value: string; count?: number }[] = [];

    for (const m of mlsMatches) {
      const addr = streetAddress(m, { unit: false });
      suggestions.push({
        type: "mls",
        text: `MLS® ${m.mlsNumber} — ${[addr, m.city].filter(Boolean).join(", ")}`,
        value: m.mlsNumber,
      });
    }

    for (const a of addresses) {
      const addr = streetAddress(a);
      if (!addr) continue;
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

    // Places before individual addresses: "Markham" should offer the city first
    const rank: Record<string, number> = { mls: 0, city: 1, neighbourhood: 2, address: 3 };
    suggestions.sort((a, b) => rank[a.type] - rank[b.type]);
    return NextResponse.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
