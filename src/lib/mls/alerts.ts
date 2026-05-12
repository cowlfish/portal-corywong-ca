import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

interface SearchCriteria {
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
}

export interface AlertGenerationResult {
  searchesProcessed: number;
  alertsCreated: number;
  errors: number;
}

export async function generateAlerts(): Promise<AlertGenerationResult> {
  const searches = await prisma.savedSearch.findMany({
    where: { alertEnabled: true },
    select: {
      id: true,
      userId: true,
      criteria: true,
      lastAlertedAt: true,
    },
  });

  let alertsCreated = 0;
  let errors = 0;

  for (const search of searches) {
    try {
      const criteria = search.criteria as SearchCriteria;
      const since = search.lastAlertedAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

      const where: Prisma.MlsListingWhereInput = {
        status: "ACTIVE",
        createdAt: { gt: since },
      };

      if (criteria.city) {
        where.city = { equals: criteria.city, mode: "insensitive" };
      }
      if (criteria.propertyType) {
        where.propertyType = { equals: criteria.propertyType, mode: "insensitive" };
      }
      if (criteria.minPrice != null) {
        where.listPrice = { ...(where.listPrice as object), gte: criteria.minPrice };
      }
      if (criteria.maxPrice != null) {
        where.listPrice = { ...(where.listPrice as object), lte: criteria.maxPrice };
      }
      if (criteria.minBeds != null) {
        where.bedrooms = { gte: criteria.minBeds };
      }
      if (criteria.minBaths != null) {
        where.bathrooms = { gte: criteria.minBaths };
      }

      const matchingListings = await prisma.mlsListing.findMany({
        where,
        select: { id: true },
        take: 100,
      });

      if (matchingListings.length === 0) continue;

      const existingAlerts = await prisma.propertyAlert.findMany({
        where: {
          savedSearchId: search.id,
          listingId: { in: matchingListings.map((l) => l.id) },
        },
        select: { listingId: true },
      });
      const existingSet = new Set(existingAlerts.map((a) => a.listingId));

      const newListings = matchingListings.filter((l) => !existingSet.has(l.id));
      if (newListings.length === 0) continue;

      await prisma.propertyAlert.createMany({
        data: newListings.map((l) => ({
          userId: search.userId,
          savedSearchId: search.id,
          listingId: l.id,
          alertType: "NEW_LISTING" as const,
        })),
      });

      await prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastAlertedAt: new Date() },
      });

      alertsCreated += newListings.length;
    } catch {
      errors++;
    }
  }

  return { searchesProcessed: searches.length, alertsCreated, errors };
}
