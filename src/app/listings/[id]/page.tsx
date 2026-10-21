import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ListingDetailClient from "./ListingDetailClient";
import { createProvider } from "@/lib/mls/providers";
import type { MlsFeedProvider } from "@/lib/mls/types";
import { NOT_COMMERCIAL } from "@/lib/mls/listing-scope";

// Photos and rooms come from the feed live: the mirror keeps only the cover photo, and the
// feed's room records (~110M) are too many to copy. Falls back to stored data if the feed is
// slow or unavailable.
async function fromFeed<T>(fetcher: (p: MlsFeedProvider) => Promise<T>): Promise<T | null> {
  if (!process.env.AMPRE_API_TOKEN) return null;
  try {
    const provider = await createProvider("ampre-reso", {
      apiUrl: process.env.AMPRE_API_URL ?? "https://query.ampre.ca/odata",
      apiToken: process.env.AMPRE_API_TOKEN,
    });
    return await Promise.race([
      fetcher(provider),
      // Generous enough for a cold start; the page waits this long at most
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await prisma.mlsListing.findFirst({
    where: { OR: [{ id }, { mlsNumber: id }], status: "ACTIVE", AND: [NOT_COMMERCIAL] },
    select: { mlsNumber: true, streetNumber: true, streetName: true, city: true, listPrice: true, propertyType: true },
  });

  if (!listing) return { title: "Listing Not Found" };

  const addr = [listing.streetNumber, listing.streetName].filter(Boolean).join(" ");
  const price = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
    Number(listing.listPrice)
  );

  return {
    title: `${addr}, ${listing.city} — ${price} | Cory Wong, Broker, Trustwell Realty Inc., Brokerage`,
    description: `${listing.propertyType || "Property"} for sale in ${listing.city}. MLS® ${listing.mlsNumber}. ${price}.`,
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const listing = await prisma.mlsListing.findFirst({
    where: { OR: [{ id }, { mlsNumber: id }], status: "ACTIVE", AND: [NOT_COMMERCIAL] },
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

  if (!listing) notFound();

  const [livePhotos, liveRooms] = await Promise.all([
    fromFeed((p) => p.fetchListingPhotos(listing.listingKey)),
    listing.rooms.length === 0 ? fromFeed((p) => p.fetchListingRooms(listing.listingKey)) : Promise.resolve(null),
  ]);
  const gallery = livePhotos && livePhotos.length > 0 ? livePhotos : null;
  const rooms = liveRooms?.map((r, i) => ({
    id: r.roomKey || `room-${i}`,
    listingId: listing.id,
    roomKey: r.roomKey,
    roomType: r.roomType ?? null,
    roomLevel: r.roomLevel ?? null,
    roomDimensions: r.roomDimensions ?? null,
    roomArea: r.roomArea ?? null,
    roomDescription: r.roomDescription ?? null,
  }));
  const withPhotos = {
    ...listing,
    ...(rooms && rooms.length > 0 && { rooms }),
    ...(gallery && {
        photos: gallery.map((p, i) => ({
          id: p.mediaKey || `photo-${i}`,
          listingId: listing.id,
          photoUrl: p.photoUrl,
          displayOrder: p.displayOrder,
          caption: p.caption ?? null,
          width: p.width ?? null,
          height: p.height ?? null,
        })),
    }),
  };

  const serialized = JSON.parse(
    JSON.stringify(withPhotos, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  return <ListingDetailClient listing={serialized} />;
}
