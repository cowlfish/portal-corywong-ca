import type { Prisma } from "@/generated/prisma/client";

// The portal is for residential buyers and renters. The feed's broad class "Commercial"
// (retail, office, industrial, sale of business, ...) is left out of everything clients see,
// and the sync no longer stores it.
export const COMMERCIAL_TYPE = "Commercial";

export const NOT_COMMERCIAL: Prisma.MlsListingWhereInput = {
  OR: [{ propertyType: null }, { propertyType: { not: COMMERCIAL_TYPE } }],
};
