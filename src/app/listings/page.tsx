"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import PropertyCard, { type PropertyCardListing } from "@/components/listings/PropertyCard";
import PropertyFilters, { type FilterValues, INITIAL_FILTERS } from "@/components/listings/PropertyFilters";
import IdxDisclaimer from "@/components/listings/IdxDisclaimer";

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

export default function ListingsPage() {
  const [listings, setListings] = useState<PropertyCardListing[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 24, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState<FilterValues>(INITIAL_FILTERS);
  const [view, setView] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(true);
  const [mapBounds, setMapBounds] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchListings = useCallback(
    async (f: FilterValues, page: number, bounds?: string | null) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "24");

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
    fetchListings(filters, pagination.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplyFilters(f: FilterValues) {
    setFilters(f);
    fetchListings(f, 1);
  }

  function handlePageChange(page: number) {
    fetchListings(filters, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBoundsChange(bounds: string) {
    setMapBounds(bounds);
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
            <ListingMap listings={listings} onBoundsChange={handleBoundsChange} />
          </div>
        )}

        {view === "split" && (
          <div className="flex gap-6 h-[calc(100vh-320px)] min-h-[500px]">
            <div className="w-1/2 overflow-y-auto pr-2 space-y-4">
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
            <div className="w-1/2 rounded-lg overflow-hidden border border-slate-200">
              <ListingMap listings={listings} onBoundsChange={handleBoundsChange} />
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

      <IdxDisclaimer className="mt-8" />
    </div>
  );
}
