"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PhotoCarousel from "@/components/listings/PhotoCarousel";
import IdxDisclaimer from "@/components/listings/IdxDisclaimer";
import CommentThread from "@/components/listings/CommentThread";

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

function SaveToListButton({ mlsNumber }: { mlsNumber: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const favs: string[] = JSON.parse(localStorage.getItem("cw_saved_listings") || "[]");
      setSaved(favs.includes(mlsNumber));
    } catch { /* ignore */ }
  }, [mlsNumber]);

  function toggle() {
    try {
      const favs: string[] = JSON.parse(localStorage.getItem("cw_saved_listings") || "[]");
      const next = saved ? favs.filter((f) => f !== mlsNumber) : [...favs, mlsNumber];
      localStorage.setItem("cw_saved_listings", JSON.stringify(next));
      setSaved(!saved);
    } catch { /* ignore */ }
  }

  return (
    <button
      onClick={toggle}
      className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-md border transition-colors ${
        saved
          ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
      }`}
    >
      <svg className="w-5 h-5" fill={saved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {saved ? "Saved to List" : "Save to List"}
    </button>
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
              {l.priceHistory.length >= 2 && (
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[...l.priceHistory]
                        .reverse()
                        .map((ph) => ({
                          date: new Date(ph.changeDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
                          price: typeof ph.newPrice === "string" ? parseFloat(ph.newPrice) : ph.newPrice,
                        }))}
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                        tick={{ fontSize: 12 }}
                        width={60}
                      />
                      <Tooltip
                        formatter={(value) => [formatPrice(Number(value)), "Price"]}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Line type="monotone" dataKey="price" stroke="#0f172a" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
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

          <CommentThread listingId={l.id} />
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 sticky top-6 space-y-4">
            <button
              onClick={() => {
                const mailto = `mailto:cory@corywong.ca?subject=${encodeURIComponent(`Tour Request — MLS® ${l.mlsNumber}`)}&body=${encodeURIComponent(`Hi Cory,\n\nI'd like to schedule a tour for the property at ${address}, ${l.city || ""}.\n\nPlease let me know available times.\n\nThank you!`)}`;
                window.location.href = mailto;
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Request a Tour
            </button>

            <SaveToListButton mlsNumber={l.mlsNumber} />

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-medium text-slate-900 mb-3">Contact Agent</h3>
              <a
                href={`mailto:cory@corywong.ca?subject=${encodeURIComponent(`Inquiry — MLS® ${l.mlsNumber}`)}`}
                className="block w-full text-center px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
              >
                Email Cory Wong
              </a>
              <a
                href="tel:+1-416-498-9995"
                className="mt-2 block w-full text-center px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
              >
                Call: (416) 498-9995
              </a>
            </div>

            {l.virtualTourUrl && (
              <a
                href={l.virtualTourUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2.5 border border-blue-300 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-50 transition-colors"
              >
                Virtual Tour
              </a>
            )}

            <div className="border-t border-slate-200 pt-4">
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
