import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ListingDetailClient from "./ListingDetailClient";
import { createProvider } from "@/lib/mls/providers";

// The mirror stores only each listing's cover photo, so the gallery comes from the feed.
// Falls back to the stored photo if the feed is slow or unavailable.
async function livePhotos(listingKey: string) {
  if (!process.env.AMPRE_API_TOKEN) return null;
  try {
    const provider = await createProvider("ampre-reso", {
      apiUrl: process.env.AMPRE_API_URL ?? "https://query.ampre.ca/odata",
      apiToken: process.env.AMPRE_API_TOKEN,
    });
    const photos = await Promise.race([
      provider.fetchListingPhotos(listingKey),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    return photos && photos.length > 0 ? photos : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await prisma.mlsListing.findFirst({
    where: { OR: [{ id }, { mlsNumber: id }], status: "ACTIVE" },
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
    where: { OR: [{ id }, { mlsNumber: id }], status: "ACTIVE" },
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

  const gallery = await livePhotos(listing.listingKey);
  const withPhotos = gallery
    ? {
        ...listing,
        photos: gallery.map((p, i) => ({
          id: p.mediaKey || `photo-${i}`,
          listingId: listing.id,
          photoUrl: p.photoUrl,
          displayOrder: p.displayOrder,
          caption: p.caption ?? null,
          width: p.width ?? null,
          height: p.height ?? null,
        })),
      }
    : listing;

  const serialized = JSON.parse(
    JSON.stringify(withPhotos, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  return <ListingDetailClient listing={serialized} />;
}
