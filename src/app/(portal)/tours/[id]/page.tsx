"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TourStop {
  id: string;
  address: string;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  latitude: string | null;
  longitude: string | null;
  sortOrder: number;
  scheduledTime: string | null;
  duration: number;
  notes: string | null;
  listPrice: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  photoUrl: string | null;
  mlsNumber: string | null;
  listingId: string | null;
}

interface Tour {
  id: string;
  title: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  tourDate: string | null;
  notes: string | null;
  status: string;
  shareToken: string | null;
  stops: TourStop[];
  user: { firstName: string; lastName: string; email: string; phone: string | null };
}

interface ListingResult {
  id: string;
  mlsNumber: string;
  listPrice: string;
  streetNumber: string | null;
  streetName: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  photos: { photoUrl: string }[];
}

export default function TourEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ListingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<{
    totalDistanceKm: number;
    stopsOptimized: number;
  } | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const clientNameRef = useRef<HTMLInputElement>(null);
  const clientEmailRef = useRef<HTMLInputElement>(null);
  const clientPhoneRef = useRef<HTMLInputElement>(null);
  const tourDateRef = useRef<HTMLInputElement>(null);
  const tourNotesRef = useRef<HTMLTextAreaElement>(null);

  const manualAddressRef = useRef<HTMLInputElement>(null);
  const manualCityRef = useRef<HTMLInputElement>(null);
  const manualProvinceRef = useRef<HTMLInputElement>(null);
  const manualPostalRef = useRef<HTMLInputElement>(null);

  const loadTour = useCallback(async () => {
    const res = await fetch(`/api/tours/${id}`);
    const data = await res.json();
    if (data.tour) setTour(data.tour);
    else router.push("/tours");
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadTour();
  }, [loadTour]);

  async function saveDetails() {
    if (!tour) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tours/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleRef.current?.value || tour.title,
          clientName: clientNameRef.current?.value || null,
          clientEmail: clientEmailRef.current?.value || null,
          clientPhone: clientPhoneRef.current?.value || null,
          tourDate: tourDateRef.current?.value || null,
          notes: tourNotesRef.current?.value || null,
        }),
      });
      const data = await res.json();
      if (data.tour) {
        setTour((prev) => (prev ? { ...prev, ...data.tour, user: prev.user } : prev));
        setEditingDetails(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function searchListings() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/listings?q=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await res.json();
      setSearchResults(data.listings || []);
    } finally {
      setSearching(false);
    }
  }

  async function addListingStop(listing: ListingResult) {
    const res = await fetch(`/api/tours/${id}/stops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id }),
    });
    const data = await res.json();
    if (data.stop) {
      setTour((prev) =>
        prev ? { ...prev, stops: [...prev.stops, data.stop] } : prev
      );
      setShowSearch(false);
      setSearchQuery("");
      setSearchResults([]);
    }
  }

  async function addManualStop() {
    const address = manualAddressRef.current?.value;
    if (!address?.trim()) return;

    const res = await fetch(`/api/tours/${id}/stops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: address.trim(),
        city: manualCityRef.current?.value || null,
        province: manualProvinceRef.current?.value || "ON",
        postalCode: manualPostalRef.current?.value || null,
      }),
    });
    const data = await res.json();
    if (data.stop) {
      setTour((prev) =>
        prev ? { ...prev, stops: [...prev.stops, data.stop] } : prev
      );
      setShowManualAdd(false);
      if (manualAddressRef.current) manualAddressRef.current.value = "";
      if (manualCityRef.current) manualCityRef.current.value = "";
      if (manualPostalRef.current) manualPostalRef.current.value = "";
    }
  }

  async function removeStop(stopId: string) {
    await fetch(`/api/tours/${id}/stops/${stopId}`, { method: "DELETE" });
    setTour((prev) =>
      prev ? { ...prev, stops: prev.stops.filter((s) => s.id !== stopId) } : prev
    );
  }

  async function updateStopNotes(stopId: string, notes: string) {
    await fetch(`/api/tours/${id}/stops/${stopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  }

  async function updateStopTime(stopId: string, scheduledTime: string) {
    const res = await fetch(`/api/tours/${id}/stops/${stopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledTime: scheduledTime || null }),
    });
    const data = await res.json();
    if (data.stop) {
      setTour((prev) =>
        prev
          ? {
              ...prev,
              stops: prev.stops.map((s) => (s.id === stopId ? { ...s, ...data.stop } : s)),
            }
          : prev
      );
    }
  }

  async function optimizeRoute() {
    setOptimizing(true);
    try {
      const res = await fetch(`/api/tours/${id}/optimize`, { method: "POST" });
      const data = await res.json();
      if (data.tour) {
        setTour((prev) => (prev ? { ...prev, stops: data.tour.stops } : prev));
        setOptimizationResult(data.optimization);
      }
    } finally {
      setOptimizing(false);
    }
  }

  async function getShareLink() {
    const res = await fetch(`/api/tours/${id}/share`, { method: "POST" });
    const data = await res.json();
    if (data.shareUrl) {
      setShareUrl(window.location.origin + data.shareUrl);
    }
  }

  async function updateStatus(status: string) {
    const res = await fetch(`/api/tours/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.tour) {
      setTour((prev) => (prev ? { ...prev, status: data.tour.status } : prev));
    }
  }

  function moveStop(index: number, direction: "up" | "down") {
    if (!tour) return;
    const stops = [...tour.stops];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= stops.length) return;

    [stops[index], stops[swapIdx]] = [stops[swapIdx], stops[index]];

    stops.forEach((s, i) => {
      s.sortOrder = i;
    });

    setTour({ ...tour, stops });

    Promise.all([
      fetch(`/api/tours/${id}/stops/${stops[index].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: index }),
      }),
      fetch(`/api/tours/${id}/stops/${stops[swapIdx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: swapIdx }),
      }),
    ]);
  }

  if (loading || !tour) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading tour...</div>
      </div>
    );
  }

  const statusOptions = [
    { value: "DRAFT", label: "Draft" },
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/tours" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Back to Tours
        </Link>
      </div>

      {/* Tour Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        {editingDetails ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tour Title</label>
              <input
                ref={titleRef}
                defaultValue={tour.title}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
                <input
                  ref={clientNameRef}
                  defaultValue={tour.clientName || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Email</label>
                <input
                  ref={clientEmailRef}
                  type="email"
                  defaultValue={tour.clientEmail || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Phone</label>
                <input
                  ref={clientPhoneRef}
                  type="tel"
                  defaultValue={tour.clientPhone || ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tour Date</label>
                <input
                  ref={tourDateRef}
                  type="date"
                  defaultValue={tour.tourDate ? new Date(tour.tourDate).toISOString().split("T")[0] : ""}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={tour.status}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                ref={tourNotesRef}
                rows={3}
                defaultValue={tour.notes || ""}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveDetails}
                disabled={saving}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Details"}
              </button>
              <button
                onClick={() => setEditingDetails(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{tour.title}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  {tour.clientName && <span>Client: {tour.clientName}</span>}
                  {tour.tourDate && (
                    <span>Date: {new Date(tour.tourDate).toLocaleDateString("en-CA")}</span>
                  )}
                  <span>{tour.stops.length} stops</span>
                </div>
                {tour.notes && <p className="mt-2 text-sm text-slate-600">{tour.notes}</p>}
              </div>
              <button
                onClick={() => setEditingDetails(true)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Edit Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => {
            setShowSearch(true);
            setShowManualAdd(false);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          + Add from MLS
        </button>
        <button
          onClick={() => {
            setShowManualAdd(true);
            setShowSearch(false);
          }}
          className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
        >
          + Manual Address
        </button>
        {tour.stops.length >= 2 && (
          <button
            onClick={optimizeRoute}
            disabled={optimizing}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
          >
            {optimizing ? "Optimizing..." : "Optimize Route"}
          </button>
        )}
        <button
          onClick={getShareLink}
          className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
        >
          Share Tour
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm"
        >
          Print Tour Sheet
        </button>
      </div>

      {/* Optimization Result */}
      {optimizationResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-emerald-800">
            Route optimized: {optimizationResult.stopsOptimized} stops, ~{optimizationResult.totalDistanceKm} km total
            distance
          </p>
        </div>
      )}

      {/* Share URL */}
      {shareUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-blue-800 mb-2">Shareable Tour Link</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-1.5 text-sm bg-white border border-blue-200 rounded-lg"
            />
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* MLS Search Panel */}
      {showSearch && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Search MLS Listings</h3>
            <button
              onClick={() => setShowSearch(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchListings()}
              placeholder="Search by address, MLS#, city, or neighbourhood..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button
              onClick={searchListings}
              disabled={searching}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {searching ? "..." : "Search"}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                >
                  {listing.photos[0]?.photoUrl ? (
                    <img
                      src={listing.photos[0].photoUrl}
                      alt=""
                      className="w-16 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-12 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400">
                      No photo
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {listing.streetNumber} {listing.streetName} — {listing.city}
                    </div>
                    <div className="text-xs text-slate-500">
                      MLS# {listing.mlsNumber} | ${Number(listing.listPrice).toLocaleString()} |{" "}
                      {listing.bedrooms} bed / {listing.bathrooms} bath
                    </div>
                  </div>
                  <button
                    onClick={() => addListingStop(listing)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                  >
                    Add Stop
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Address Add */}
      {showManualAdd && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Add Address Manually</h3>
            <button
              onClick={() => setShowManualAdd(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <input
                ref={manualAddressRef}
                placeholder="Street address"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <input
              ref={manualCityRef}
              placeholder="City"
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="flex gap-2">
              <input
                ref={manualProvinceRef}
                placeholder="Province"
                defaultValue="ON"
                className="w-20 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <input
                ref={manualPostalRef}
                placeholder="Postal code"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
          <button
            onClick={addManualStop}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            Add Stop
          </button>
        </div>
      )}

      {/* Stop List */}
      <div className="space-y-3">
        {tour.stops.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <p className="text-slate-500">
              No stops added yet. Add properties from MLS or enter addresses manually.
            </p>
          </div>
        ) : (
          tour.stops.map((stop, idx) => (
            <div
              key={stop.id}
              className="bg-white rounded-lg border border-slate-200 p-4 print:break-inside-avoid"
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 print:hidden">
                  <button
                    onClick={() => moveStop(idx, "up")}
                    disabled={idx === 0}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30"
                    title="Move up"
                  >
                    &#x25B2;
                  </button>
                  <span className="text-lg font-bold text-slate-300">{idx + 1}</span>
                  <button
                    onClick={() => moveStop(idx, "down")}
                    disabled={idx === tour.stops.length - 1}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30"
                    title="Move down"
                  >
                    &#x25BC;
                  </button>
                </div>
                <span className="hidden print:block text-lg font-bold text-slate-400 mr-2">{idx + 1}.</span>

                {stop.photoUrl && (
                  <img
                    src={stop.photoUrl}
                    alt=""
                    className="w-24 h-18 object-cover rounded-lg flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 truncate">{stop.address}</h3>
                    {stop.mlsNumber && (
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        MLS# {stop.mlsNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {[stop.city, stop.province, stop.postalCode].filter(Boolean).join(", ")}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                    {stop.listPrice && <span>${Number(stop.listPrice).toLocaleString()}</span>}
                    {stop.bedrooms != null && <span>{stop.bedrooms} bed</span>}
                    {stop.bathrooms != null && <span>{stop.bathrooms} bath</span>}
                    {stop.propertyType && <span>{stop.propertyType}</span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2 print:hidden">
                    <div>
                      <label className="text-xs text-slate-400">Time</label>
                      <input
                        type="time"
                        defaultValue={
                          stop.scheduledTime
                            ? new Date(stop.scheduledTime).toLocaleTimeString("en-CA", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })
                            : ""
                        }
                        onChange={(e) => {
                          if (e.target.value && tour.tourDate) {
                            const dt = new Date(tour.tourDate);
                            const [h, m] = e.target.value.split(":");
                            dt.setHours(parseInt(h), parseInt(m), 0, 0);
                            updateStopTime(stop.id, dt.toISOString());
                          } else if (!e.target.value) {
                            updateStopTime(stop.id, "");
                          }
                        }}
                        className="ml-1 px-2 py-1 text-sm border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Notes</label>
                      <input
                        defaultValue={stop.notes || ""}
                        onBlur={(e) => updateStopNotes(stop.id, e.target.value)}
                        placeholder="Add notes..."
                        className="ml-1 px-2 py-1 text-sm border border-slate-200 rounded w-48"
                      />
                    </div>
                  </div>
                  {stop.scheduledTime && (
                    <div className="hidden print:block mt-1 text-sm text-slate-600">
                      Showing: {new Date(stop.scheduledTime).toLocaleTimeString("en-CA", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                  {stop.notes && (
                    <div className="hidden print:block mt-1 text-sm text-slate-600">
                      Notes: {stop.notes}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removeStop(stop.id)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 print:hidden"
                  title="Remove stop"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-slate-200">
        <div className="text-sm text-slate-600">
          <p className="font-semibold">
            Agent: {tour.user.firstName} {tour.user.lastName}
          </p>
          <p>{tour.user.email} {tour.user.phone && `| ${tour.user.phone}`}</p>
          {tour.clientName && <p className="mt-2">Prepared for: {tour.clientName}</p>}
          {tour.tourDate && (
            <p>Tour Date: {new Date(tour.tourDate).toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          )}
        </div>
      </div>
    </div>
  );
}
