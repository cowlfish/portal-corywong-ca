"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import PhotoCarousel from "@/components/listings/PhotoCarousel";
import IdxDisclaimer from "@/components/listings/IdxDisclaimer";

const ListingMap = dynamic(() => import("@/components/listings/ListingMap"), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-slate-200 rounded-lg animate-pulse" />,
});

interface Photo {
  id: string;
  photoUrl: string;
  caption: string | null;
  displayOrder: number;
}

interface Room {
  id: string;
  roomType: string | null;
  roomLevel: string | null;
  roomDimensions: string | null;
  roomDescription: string | null;
}

interface OpenHouse {
  id: string;
  startDate: string;
  endDate: string;
  remarks: string | null;
}

interface PriceHistory {
  id: string;
  changeDate: string;
  oldPrice: string | number;
  newPrice: string | number;
  changeType: string | null;
}

interface Listing {
  id: string;
  mlsNumber: string;
  listPrice: string | number;
  soldPrice: string | number | null;
  originalPrice: string | number | null;
  status: string;
  propertyType: string | null;
  propertySubType: string | null;
  transactionType: string | null;
  streetNumber: string | null;
  streetName: string | null;
  streetSuffix: string | null;
  streetDirection: string | null;
  unitNumber: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  municipality: string | null;
  community: string | null;
  neighbourhood: string | null;
  area: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  bedrooms: number | null;
  bedroomsPlus: number | null;
  bathrooms: number | null;
  bathroomsHalf: number | null;
  sqft: string | number | null;
  sqftRangeMin: string | number | null;
  sqftRangeMax: string | number | null;
  lotSizeSqft: string | number | null;
  lotFrontage: string | number | null;
  lotDepth: string | number | null;
  yearBuilt: number | null;
  stories: string | number | null;
  parkingSpaces: number | null;
  garageType: string | null;
  garageSpaces: number | null;
  maintenanceFee: string | number | null;
  condoExposure: string | null;
  condoStyle: string | null;
  balcony: string | null;
  locker: string | null;
  listDate: string | null;
  daysOnMarket: number | null;
  virtualTourUrl: string | null;
  publicRemarks: string | null;
  extrasRemarks: string | null;
  featuresRemarks: string | null;
  taxAmount: string | number | null;
  taxYear: number | null;
  listAgentName: string | null;
  listOfficeName: string | null;
  listOfficeId: string | null;
  coListAgentName: string | null;
  photos: Photo[];
  rooms: Room[];
  openHouses: OpenHouse[];
  priceHistory: PriceHistory[];
}

function formatPrice(price: string | number | null): string {
  if (price == null) return "N/A";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
    typeof price === "string" ? parseFloat(price) : price
  );
}

function formatAddress(l: Listing): string {
  return [l.unitNumber ? `${l.unitNumber} -` : null, l.streetNumber, l.streetName, l.streetSuffix, l.streetDirection]
    .filter(Boolean)
    .join(" ");
}

function formatSqft(l: Listing): string {
  if (l.sqft) return `${Number(l.sqft).toLocaleString()} sqft`;
  if (l.sqftRangeMin && l.sqftRangeMax)
    return `${Number(l.sqftRangeMin).toLocaleString()}-${Number(l.sqftRangeMax).toLocaleString()} sqft`;
  return "N/A";
}

function Spec({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between py-2 border-b border-slate-100">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default function ListingDetailClient({ listing }: { listing: Listing }) {
  const l = listing;
  const address = formatAddress(l);
  const totalBeds = (l.bedrooms || 0) + (l.bedroomsPlus || 0);
  const totalBaths = (l.bathrooms || 0) + (l.bathroomsHalf ? l.bathroomsHalf * 0.5 : 0);
  const hasGeo = l.latitude != null && l.longitude != null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-4">
        <Link href="/listings" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          &larr; Back to Search
        </Link>
      </div>

      <PhotoCarousel photos={l.photos} />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{formatPrice(l.listPrice)}</h1>
                <p className="text-lg text-slate-700 mt-1">{address || "Address unavailable"}</p>
                <p className="text-slate-500">
                  {[l.city, l.province, l.postalCode].filter(Boolean).join(", ")}
                </p>
                {l.neighbourhood && <p className="text-sm text-slate-500">{l.neighbourhood}</p>}
              </div>
              <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                l.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                l.status === "SOLD" ? "bg-red-100 text-red-700" :
                "bg-slate-100 text-slate-700"
              }`}>
                {l.status}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              {totalBeds > 0 && <span className="flex items-center gap-1">{totalBeds} Beds</span>}
              {totalBaths > 0 && <span className="flex items-center gap-1">{totalBaths} Baths</span>}
              <span>{formatSqft(l)}</span>
              {l.propertyType && <span>{l.propertyType}</span>}
              {l.yearBuilt && <span>Built {l.yearBuilt}</span>}
            </div>
          </div>

          {l.publicRemarks && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Description</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{l.publicRemarks}</p>
            </div>
          )}

          {l.extrasRemarks && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Extras</h2>
              <p className="text-slate-600">{l.extrasRemarks}</p>
            </div>
          )}

          {l.featuresRemarks && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Features</h2>
              <p className="text-slate-600">{l.featuresRemarks}</p>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Property Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <div>
                <Spec label="MLS® Number" value={l.mlsNumber} />
                <Spec label="Property Type" value={l.propertyType} />
                <Spec label="Property Sub-Type" value={l.propertySubType} />
                <Spec label="Transaction Type" value={l.transactionType} />
                <Spec label="Bedrooms" value={l.bedrooms != null ? `${l.bedrooms}${l.bedroomsPlus ? ` + ${l.bedroomsPlus}` : ""}` : null} />
                <Spec label="Bathrooms" value={l.bathrooms != null ? `${l.bathrooms}${l.bathroomsHalf ? ` + ${l.bathroomsHalf} half` : ""}` : null} />
                <Spec label="Size" value={formatSqft(l) !== "N/A" ? formatSqft(l) : null} />
                <Spec label="Lot Size" value={l.lotSizeSqft ? `${Number(l.lotSizeSqft).toLocaleString()} sqft` : null} />
                <Spec label="Lot Frontage" value={l.lotFrontage ? `${l.lotFrontage} ft` : null} />
                <Spec label="Lot Depth" value={l.lotDepth ? `${l.lotDepth} ft` : null} />
              </div>
              <div>
                <Spec label="Year Built" value={l.yearBuilt} />
                <Spec label="Stories" value={l.stories != null ? Number(l.stories) : null} />
                <Spec label="Parking" value={l.parkingSpaces != null ? `${l.parkingSpaces} spaces` : null} />
                <Spec label="Garage" value={l.garageType ? `${l.garageType}${l.garageSpaces ? ` (${l.garageSpaces})` : ""}` : null} />
                <Spec label="Maintenance Fee" value={l.maintenanceFee ? formatPrice(l.maintenanceFee) + "/mo" : null} />
                <Spec label="Condo Style" value={l.condoStyle} />
                <Spec label="Exposure" value={l.condoExposure} />
                <Spec label="Balcony" value={l.balcony} />
                <Spec label="Locker" value={l.locker} />
                <Spec label="Taxes" value={l.taxAmount ? `${formatPrice(l.taxAmount)}${l.taxYear ? ` (${l.taxYear})` : ""}` : null} />
              </div>
            </div>
          </div>

          {l.rooms.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Rooms</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-2 pr-4 font-medium text-slate-500">Room</th>
                      <th className="py-2 pr-4 font-medium text-slate-500">Level</th>
                      <th className="py-2 pr-4 font-medium text-slate-500">Dimensions</th>
                      <th className="py-2 font-medium text-slate-500">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.rooms.map((room) => (
                      <tr key={room.id} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-900">{room.roomType || "—"}</td>
                        <td className="py-2 pr-4 text-slate-600">{room.roomLevel || "—"}</td>
                        <td className="py-2 pr-4 text-slate-600">{room.roomDimensions || "—"}</td>
                        <td className="py-2 text-slate-600">{room.roomDescription || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {l.openHouses.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Upcoming Open Houses</h2>
              <div className="space-y-2">
                {l.openHouses.map((oh) => (
                  <div key={oh.id} className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="text-sm text-blue-900 font-medium">
                      {new Date(oh.startDate).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    <div className="text-sm text-blue-700">
                      {new Date(oh.startDate).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
                      {" — "}
                      {new Date(oh.endDate).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
                    </div>
                    {oh.remarks && <div className="text-xs text-blue-600">{oh.remarks}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {l.priceHistory.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Price History</h2>
              <div className="space-y-1">
                {l.priceHistory.map((ph) => (
                  <div key={ph.id} className="flex items-center gap-4 text-sm py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 w-28">
                      {new Date(ph.changeDate).toLocaleDateString("en-CA")}
                    </span>
                    <span className="text-slate-400 line-through">{formatPrice(ph.oldPrice)}</span>
                    <span className="text-slate-900 font-medium">{formatPrice(ph.newPrice)}</span>
                    {ph.changeType && <span className="text-xs text-slate-400">{ph.changeType}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasGeo && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Location</h2>
              <div className="h-80 rounded-lg overflow-hidden border border-slate-200">
                <ListingMap
                  listings={[{
                    id: l.id,
                    mlsNumber: l.mlsNumber,
                    listPrice: l.listPrice,
                    latitude: l.latitude,
                    longitude: l.longitude,
                    streetNumber: l.streetNumber,
                    streetName: l.streetName,
                    city: l.city,
                    bedrooms: l.bedrooms,
                    bathrooms: l.bathrooms,
                  }]}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Agent</h2>
            <p className="text-sm text-slate-600 mb-4">
              Interested in this property? Contact Cory Wong for more information or to schedule a viewing.
            </p>
            <a
              href="mailto:cory@corywong.ca?subject=Inquiry%20about%20MLS%20listing%20"
              className="block w-full text-center px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
            >
              Email Cory Wong
            </a>
            <a
              href="tel:+1-416-555-0100"
              className="mt-3 block w-full text-center px-4 py-3 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
            >
              Call: (416) 555-0100
            </a>

            {l.virtualTourUrl && (
              <a
                href={l.virtualTourUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block w-full text-center px-4 py-3 border border-blue-300 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-50 transition-colors"
              >
                Virtual Tour
              </a>
            )}

            <div className="mt-6 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-900 mb-2">Listing Details</h3>
              <div className="space-y-1 text-xs text-slate-500">
                <p>MLS&reg; {l.mlsNumber}</p>
                {l.listDate && <p>Listed: {new Date(l.listDate).toLocaleDateString("en-CA")}</p>}
                {l.daysOnMarket != null && <p>{l.daysOnMarket} days on market</p>}
                {l.listOfficeName && <p>Listed by: {l.listOfficeName}</p>}
                {l.listAgentName && <p>Agent: {l.listAgentName}</p>}
                {l.coListAgentName && <p>Co-list Agent: {l.coListAgentName}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <IdxDisclaimer className="mt-8" />
    </div>
  );
}
