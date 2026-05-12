import Link from "next/link";

export interface PropertyCardListing {
  id: string;
  mlsNumber: string;
  listPrice: string | number;
  propertyType: string | null;
  propertySubType: string | null;
  streetNumber: string | null;
  streetName: string | null;
  streetSuffix: string | null;
  unitNumber: string | null;
  city: string | null;
  province: string | null;
  neighbourhood: string | null;
  bedrooms: number | null;
  bedroomsPlus: number | null;
  bathrooms: number | null;
  bathroomsHalf: number | null;
  sqft: string | number | null;
  sqftRangeMin: string | number | null;
  sqftRangeMax: string | number | null;
  latitude: string | number | null;
  longitude: string | number | null;
  daysOnMarket: number | null;
  listOfficeName: string | null;
  photos: { photoUrl: string }[];
}

function formatPrice(price: string | number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(typeof price === "string" ? parseFloat(price) : price);
}

function formatAddress(l: PropertyCardListing): string {
  const parts = [l.unitNumber ? `${l.unitNumber} -` : null, l.streetNumber, l.streetName, l.streetSuffix]
    .filter(Boolean)
    .join(" ");
  return parts || "Address unavailable";
}

function formatSqft(l: PropertyCardListing): string | null {
  if (l.sqft) return `${Number(l.sqft).toLocaleString()} sqft`;
  if (l.sqftRangeMin && l.sqftRangeMax)
    return `${Number(l.sqftRangeMin).toLocaleString()}-${Number(l.sqftRangeMax).toLocaleString()} sqft`;
  return null;
}

export default function PropertyCard({ listing }: { listing: PropertyCardListing }) {
  const photoUrl = listing.photos[0]?.photoUrl;
  const address = formatAddress(listing);
  const sqft = formatSqft(listing);

  const totalBeds = (listing.bedrooms || 0) + (listing.bedroomsPlus || 0);
  const totalBaths = (listing.bathrooms || 0) + (listing.bathroomsHalf ? listing.bathroomsHalf * 0.5 : 0);

  return (
    <Link
      href={`/listings/${listing.mlsNumber}`}
      className="group bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-slate-200 relative overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 left-2">
          {listing.propertyType && (
            <span className="inline-block bg-slate-900/80 text-white text-xs px-2 py-0.5 rounded">
              {listing.propertyType}
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="text-lg font-bold text-slate-900">{formatPrice(listing.listPrice)}</div>
        <div className="text-sm text-slate-700 mt-1 truncate">{address}</div>
        <div className="text-sm text-slate-500 truncate">
          {listing.city}
          {listing.neighbourhood ? `, ${listing.neighbourhood}` : ""}
        </div>
        <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
          {totalBeds > 0 && (
            <span>{totalBeds} {totalBeds === 1 ? "bed" : "beds"}</span>
          )}
          {totalBaths > 0 && (
            <span>{totalBaths} {totalBaths === 1 ? "bath" : "baths"}</span>
          )}
          {sqft && <span>{sqft}</span>}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>MLS&reg; {listing.mlsNumber}</span>
          {listing.daysOnMarket != null && <span>{listing.daysOnMarket}d on market</span>}
        </div>
        {listing.listOfficeName && (
          <div className="mt-1 text-xs text-slate-400 truncate">
            Listed by {listing.listOfficeName}
          </div>
        )}
      </div>
    </Link>
  );
}
