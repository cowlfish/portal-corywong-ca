// Street addresses for display, and withholding them where the seller hasn't allowed the address
// online (TRREB's InternetAddressDisplayYN). Those listings are still shown, with a placeholder
// address and no exact location, and they're left out of map and street-name searches.
// Only the agent's own pages and emails see the real address.

export const ADDRESS_HIDDEN = "Address not disclosed";

export interface AddressFields {
  unitNumber?: string | null;
  streetNumber?: string | null;
  streetDirection?: string | null;
  streetName?: string | null;
  streetSuffix?: string | null;
  streetDirSuffix?: string | null;
  addressDisplay?: boolean | null;
}

// Fields to select wherever an address is shown
export const ADDRESS_SELECT = {
  unitNumber: true,
  streetNumber: true,
  streetDirection: true,
  streetName: true,
  streetSuffix: true,
  streetDirSuffix: true,
  addressDisplay: true,
} as const;

// "500 - 690 Dorval Drive", "753 Queen Street E". ADDRESS_HIDDEN when the seller withheld it,
// unless reveal (agent-only pages and emails). null when the feed has no street address.
export function streetAddress(l: AddressFields, { unit = true, reveal = false } = {}): string | null {
  if (l.addressDisplay === false && !reveal) return ADDRESS_HIDDEN;
  // The feed sometimes has a direction in both places ("215 W Queen Street E"); Ontario
  // addresses put it after the name, so a leading one is dropped when both are set
  const prefix = l.streetDirSuffix ? null : l.streetDirection;
  const street = [l.streetNumber, prefix, l.streetName, l.streetSuffix, l.streetDirSuffix]
    .filter(Boolean)
    .join(" ");
  if (!street) return l.addressDisplay === false ? ADDRESS_HIDDEN : null;
  return unit && l.unitNumber ? `${l.unitNumber} - ${street}` : street;
}

const HIDDEN_FIELDS = [
  "unitNumber",
  "streetNumber",
  "streetDirection",
  "streetName",
  "streetSuffix",
  "streetDirSuffix",
  "latitude",
  "longitude",
  "geocodeAddress",
] as const;

// Strips the address and exact location from a withheld listing before it leaves the server.
// The postal code is cut to its first three characters (an area, not a block).
export function withoutHiddenAddress<T extends { addressDisplay?: boolean | null }>(l: T): T {
  if (l.addressDisplay !== false) return l;
  const out: Record<string, unknown> = { ...l };
  for (const key of HIDDEN_FIELDS) if (key in out) out[key] = null;
  if (typeof out.postalCode === "string") out.postalCode = out.postalCode.slice(0, 3);
  return out as T;
}

// Prisma filter: listings whose address may be shown (for map and street-name searches)
export const ADDRESS_SHOWN = { addressDisplay: true } as const;
