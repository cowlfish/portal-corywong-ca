import type { Prisma } from "@/generated/prisma/client";

// Property type filters, matched against PropertySubType from the TRREB feed. The feed's
// PropertyType is only the broad class ("Residential Freehold", "Residential Condo & Other",
// "Commercial"), so filtering on it for "Detached" never matched anything.
export const PROPERTY_TYPES = [
  { value: "Detached", label: "Detached", subTypes: ["Detached"] },
  { value: "Semi-Detached", label: "Semi-Detached", subTypes: ["Semi-Detached"] },
  { value: "Condo Apartment", label: "Condo Apartment", subTypes: ["Condo Apartment"] },
  { value: "Condo Townhouse", label: "Condo Townhouse", subTypes: ["Condo Townhouse"] },
  { value: "Att/Row/Townhouse", label: "Freehold Townhouse", subTypes: ["Att/Row/Townhouse"] },
  { value: "Common Element Condo", label: "Common Element Condo", subTypes: ["Common Element Condo"] },
  { value: "Link", label: "Link", subTypes: ["Link"] },
  { value: "Multiplex", label: "Multiplex (2–4 units)", subTypes: ["Multiplex", "Duplex", "Triplex", "Fourplex"] },
  { value: "Vacant Land", label: "Vacant Land", subTypes: ["Vacant Land"] },
] as const;

// Older TREB-style values still in saved searches, links and bookmarks
const ALIASES: Record<string, string> = {
  "condo apt": "Condo Apartment",
  "att/row/twnhouse": "Att/Row/Townhouse",
  "comm element condo": "Common Element Condo",
  townhouse: "Att/Row/Townhouse",
};

export function propertyTypeLabel(value: string): string {
  const canonical = ALIASES[value.toLowerCase()] ?? value;
  return PROPERTY_TYPES.find((t) => t.value.toLowerCase() === canonical.toLowerCase())?.label ?? value;
}

export function propertyTypeWhere(value: string): Prisma.MlsListingWhereInput {
  const canonical = ALIASES[value.toLowerCase()] ?? value;
  const type = PROPERTY_TYPES.find((t) => t.value.toLowerCase() === canonical.toLowerCase());
  // startsWith: some feed values carry trailing spaces ("Semi-Detached ")
  const subTypes: string[] = type ? [...type.subTypes] : [canonical];
  return {
    OR: [
      ...subTypes.map((s) => ({ propertySubType: { startsWith: s, mode: "insensitive" as const } })),
      // Lets the broad classes ("Commercial") work as a filter too
      { propertyType: { equals: canonical, mode: "insensitive" as const } },
    ],
  };
}
