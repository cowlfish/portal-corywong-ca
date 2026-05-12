import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ListingDetailClient from "./ListingDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await prisma.mlsListing.findFirst({
    where: { OR: [{ id }, { mlsNumber: id }] },
    select: { mlsNumber: true, streetNumber: true, streetName: true, city: true, listPrice: true, propertyType: true },
  });

  if (!listing) return { title: "Listing Not Found" };

  const addr = [listing.streetNumber, listing.streetName].filter(Boolean).join(" ");
  const price = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
    Number(listing.listPrice)
  );

  return {
    title: `${addr}, ${listing.city} — ${price} | Cory Wong Real Estate`,
    description: `${listing.propertyType || "Property"} for sale in ${listing.city}. MLS® ${listing.mlsNumber}. ${price}.`,
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const listing = await prisma.mlsListing.findFirst({
    where: { OR: [{ id }, { mlsNumber: id }] },
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

  const serialized = JSON.parse(
    JSON.stringify(listing, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  return <ListingDetailClient listing={serialized} />;
}
