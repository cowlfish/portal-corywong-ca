"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import PropertyCard, { type PropertyCardListing } from "@/components/listings/PropertyCard";
import PropertyFilters, { type FilterValues, INITIAL_FILTERS } from "@/components/listings/PropertyFilters";
import { rememberScroll, rememberSearch, savedScroll } from "@/lib/search-state";

const ListingMap = dynamic(() => import("@/components/listings/ListingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-slate-200 rounded-lg animate-pulse flex items-center justify-center text-slate-400">
      Loading map...
    </div>
  ),
});

type ViewMode = "list" | "map" | "split";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function DataPendingPlaceholder() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-6">
          <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Property Search Coming Soon</h1>
        <p className="text-slate-500 max-w-md mx-auto mb-6">
          We&apos;re connecting to the TRREB MLS data feed. Live property listings will
          appear here once the data integration is complete.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-sm font-medium">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          Data feed integration in progress
        </div>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  const [feedLive, setFeedLive] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/feature-flags")
      .then((r) => r.json())
      .then((flags) => setFeedLive(flags.ampreFeedLive ?? false))
      .catch(() => setFeedLive(false));
  }, []);

  if (feedLive === null) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!feedLive) {
    return <DataPendingPlaceholder />;
  }

  return <ListingsContent />;
}

// The whole search lives in the URL (filters, page, view, map area), so the back button, a
// refresh or a shared link reopens the same results
function useInitialSearch() {
  const sp = useSearchParams();
  const view = sp.get("view");
  return {
    filters: filtersFromParams(sp),
    page: Math.max(1, parseInt(sp.get("page") || "1", 10) || 1),
    view: (view === "map" || view === "split" ? view : "list") as ViewMode,
    mapView: sp.get("map"),
  };
}

function filtersFromParams(sp: URLSearchParams | ReturnType<typeof useSearchParams>): FilterValues {
  return {
    transaction: sp.get("transaction") === "lease" ? "lease" : "sale",
    q: sp.get("q") || "",
    minPrice: sp.get("minPrice") || "",
    maxPrice: sp.get("maxPrice") || "",
    beds: sp.get("beds") || "",
    baths: sp.get("baths") || "",
    propertyType: sp.get("propertyType") || "",
    city: sp.get("city") || "",
    neighbourhood: sp.get("neighbourhood") || "",
    minSqft: sp.get("minSqft") || "",
    maxSqft: sp.get("maxSqft") || "",
    sort: sp.get("sort") || "listDate",
    openHouses: sp.get("openHouses") || "",
  };
}

// The URL for a search; defaults are left out to keep it short
function searchUrl(f: FilterValues, page: number, view: ViewMode, mapView: string | null): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(INITIAL_FILTERS) as (keyof FilterValues)[]) {
    if (f[key] && f[key] !== INITIAL_FILTERS[key]) params.set(key, f[key]);
  }
  if (page > 1) params.set("page", String(page));
  if (view !== "list") params.set("view", view);
  // Where the map was: centre and zoom ("43.85976,-79.30695,13")
  if (mapView && view === "map") params.set("map", mapView);
  const qs = params.toString();
  return qs ? `/listings?${qs}` : "/listings";
}

function ListingsContent() {
  const initial = useInitialSearch();
  const [listings, setListings] = useState<PropertyCardListing[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: initial.page, limit: 24, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState<FilterValues>(initial.filters);
  const [view, setView] = useState<ViewMode>(initial.view);
  const [loading, setLoading] = useState(true);
  const [mapBounds, setMapBounds] = useState<string | null>(null);
  const [mapView, setMapView] = useState<string | null>(initial.mapView);
  // Scroll position is saved only after it's been restored, so the empty page shown while
  // results load doesn't overwrite it
  const scrollRestored = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchListings = useCallback(
    async (f: FilterValues, page: number, bounds?: string | null) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(page));
      // The map shows everything in view (up to 500 pins); the list pages 24 at a time
      params.set("limit", bounds && view === "map" ? "500" : "24");

      params.set("transaction", f.transaction === "lease" ? "lease" : "sale");
      if (f.q) params.set("q", f.q);
      if (f.minPrice) params.set("minPrice", f.minPrice);
      if (f.maxPrice) params.set("maxPrice", f.maxPrice);
      if (f.beds) params.set("beds", f.beds);
      if (f.baths) params.set("baths", f.baths);
      if (f.propertyType) params.set("propertyType", f.propertyType);
      if (f.city) params.set("city", f.city);
      if (f.neighbourhood) params.set("neighbourhood", f.neighbourhood);
      if (f.minSqft) params.set("minSqft", f.minSqft);
      if (f.maxSqft) params.set("maxSqft", f.maxSqft);

      if (f.openHouses === "true") params.set("openHouses", "true");

      if (f.sort.includes("-")) {
        const [field, dir] = f.sort.split("-");
        params.set("sort", field);
        params.set("dir", dir);
      } else {
        params.set("sort", f.sort);
        params.set("dir", "desc");
      }

      if (bounds && view === "map") params.set("bounds", bounds);

      try {
        const res = await fetch(`/api/listings?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setListings(data.listings);
        setPagination(data.pagination);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Failed to fetch listings:", e);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [view]
  );

  useEffect(() => {
    // Map view: the map searches its own area once it has opened (handleBoundsChange)
    fetchListings(filters, pagination.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in step with the search, replacing (not adding) history entries
  useEffect(() => {
    const url = searchUrl(filters, pagination.page, view, mapView);
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(null, "", url);
    rememberSearch(url);
  }, [filters, pagination.page, view, mapView]);

  // Back on the results: return to where the visitor had scrolled
  useEffect(() => {
    if (loading || scrollRestored.current) return;
    scrollRestored.current = true;
    const y = savedScroll(window.location.pathname + window.location.search);
    if (y) window.scrollTo(0, y);
  }, [loading]);

  useEffect(() => {
    // A timer, not requestAnimationFrame: browsers pause animation frames in background tabs
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      const y = window.scrollY;
      timer = setTimeout(() => {
        // Only on the results page itself (not after navigating to a listing)
        if (scrollRestored.current && window.location.pathname === "/listings") {
          rememberScroll(window.location.pathname + window.location.search, y);
        }
      }, 150);
    };
    // And at the moment a link is followed, which doesn't depend on scroll events arriving
    const onClick = (e: MouseEvent) => {
      if (scrollRestored.current && (e.target as Element | null)?.closest?.("a[href]")) {
        rememberScroll(window.location.pathname + window.location.search, window.scrollY);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  function handleApplyFilters(f: FilterValues) {
    setFilters(f);
    fetchListings(f, 1);
  }

  function handlePageChange(page: number) {
    fetchListings(filters, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBoundsChange(bounds: string, at: string) {
    setMapBounds(bounds);
    setMapView(at);
    if (view === "map") {
      fetchListings(filters, 1, bounds);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Property Search</h1>
        <div className="flex items-center bg-slate-200 rounded-md p-0.5">
          {(["list", "map", "split"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setView(m)}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors capitalize ${
                view === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {m === "split" ? "Split" : m === "map" ? "Map" : "List"}
            </button>
          ))}
        </div>
      </div>

      <PropertyFilters filters={filters} onApply={handleApplyFilters} total={pagination.total} />

      <div className="mt-6">
        {view === "list" && (
          <div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-slate-200 overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-slate-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-5 bg-slate-200 rounded w-24" />
                      <div className="h-4 bg-slate-200 rounded w-48" />
                      <div className="h-4 bg-slate-200 rounded w-36" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="font-medium">No listings found</p>
                <p className="text-sm mt-1">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((l) => (
                  <PropertyCard key={l.id} listing={l} />
                ))}
              </div>
            )}
          </div>
        )}

        {view === "map" && (
          <div className="h-[calc(100vh-320px)] min-h-[500px] rounded-lg overflow-hidden border border-slate-200">
            <ListingMap
              listings={listings}
              onBoundsChange={handleBoundsChange}
              fitKey={JSON.stringify(filters)}
              initialView={initial.view === "map" ? initial.mapView : null}
            />
          </div>
        )}

        {view === "split" && (
          <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-320px)] lg:min-h-[500px]">
            <div className="w-full lg:w-1/2 overflow-y-auto lg:pr-2 space-y-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-slate-200 overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-slate-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-5 bg-slate-200 rounded w-24" />
                      <div className="h-4 bg-slate-200 rounded w-48" />
                    </div>
                  </div>
                ))
              ) : listings.length === 0 ? (
                <div className="text-center py-16 text-slate-500">No listings found</div>
              ) : (
                listings.map((l) => <PropertyCard key={l.id} listing={l} />)
              )}
            </div>
            <div className="w-full lg:w-1/2 h-[400px] lg:h-auto rounded-lg overflow-hidden border border-slate-200">
              {/* Split view pins the cards on the left, so it refits per page of results */}
              <ListingMap listings={listings} fitKey={`${JSON.stringify(filters)}:${pagination.page}`} />
            </div>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && view !== "map" && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={pagination.page <= 1}
            onClick={() => handlePageChange(pagination.page - 1)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => handlePageChange(pagination.page + 1)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
