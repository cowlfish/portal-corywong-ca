"use client";

import { useCallback, useState } from "react";

export interface FilterValues {
  q: string;
  minPrice: string;
  maxPrice: string;
  beds: string;
  baths: string;
  propertyType: string;
  city: string;
  neighbourhood: string;
  minSqft: string;
  maxSqft: string;
  sort: string;
  openHouses: string;
}

const INITIAL_FILTERS: FilterValues = {
  q: "",
  minPrice: "",
  maxPrice: "",
  beds: "",
  baths: "",
  propertyType: "",
  city: "",
  neighbourhood: "",
  minSqft: "",
  maxSqft: "",
  sort: "listDate",
  openHouses: "",
};

const PROPERTY_TYPES = [
  "Detached",
  "Semi-Detached",
  "Condo Apt",
  "Condo Townhouse",
  "Att/Row/Twnhouse",
  "Comm Element Condo",
  "Link",
  "Multiplex",
  "Vacant Land",
];

const SORT_OPTIONS = [
  { value: "listDate", label: "Newest" },
  { value: "listPrice-asc", label: "Price: Low to High" },
  { value: "listPrice-desc", label: "Price: High to Low" },
  { value: "daysOnMarket-asc", label: "Days on Market" },
  { value: "bedrooms", label: "Bedrooms" },
  { value: "sqft", label: "Square Feet" },
];

const PRICE_PRESETS = [
  { label: "Under $500K", min: "", max: "500000" },
  { label: "$500K–$1M", min: "500000", max: "1000000" },
  { label: "$1M–$2M", min: "1000000", max: "2000000" },
  { label: "$2M+", min: "2000000", max: "" },
];

interface Props {
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
  total: number;
}

export default function PropertyFilters({ filters, onApply, total }: Props) {
  const [local, setLocal] = useState<FilterValues>(filters);
  const [expanded, setExpanded] = useState(false);

  const update = useCallback(
    (field: keyof FilterValues, value: string) => {
      setLocal((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onApply(local);
  }

  function handleReset() {
    setLocal(INITIAL_FILTERS);
    onApply(INITIAL_FILTERS);
  }

  function applyChip(patch: Partial<FilterValues>) {
    const next = { ...local, ...patch };
    setLocal(next);
    onApply(next);
  }

  function isChipActive(field: keyof FilterValues, value: string): boolean {
    return local[field] === value;
  }

  function isPriceActive(min: string, max: string): boolean {
    return local.minPrice === min && local.maxPrice === max;
  }

  function togglePriceChip(min: string, max: string) {
    if (isPriceActive(min, max)) {
      applyChip({ minPrice: "", maxPrice: "" });
    } else {
      applyChip({ minPrice: min, maxPrice: max });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by address, city, MLS#, or keyword..."
            value={local.q}
            onChange={(e) => update("q", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
        <select
          value={local.sort}
          onChange={(e) => {
            update("sort", e.target.value);
            onApply({ ...local, sort: e.target.value });
          }}
          className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
        >
          {expanded ? "Less Filters" : "More Filters"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRICE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => togglePriceChip(p.min, p.max)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              isPriceActive(p.min, p.max)
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="border-l border-slate-200 mx-1" />
        {[1, 2, 3, 4].map((n) => (
          <button
            key={`bed-${n}`}
            type="button"
            onClick={() => applyChip({ beds: isChipActive("beds", String(n)) ? "" : String(n) })}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              isChipActive("beds", String(n))
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
            }`}
          >
            {n}+ Beds
          </button>
        ))}
        <span className="border-l border-slate-200 mx-1" />
        {["Detached", "Condo Apt", "Semi-Detached", "Att/Row/Twnhouse"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => applyChip({ propertyType: isChipActive("propertyType", t) ? "" : t })}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              isChipActive("propertyType", t)
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
        <span className="border-l border-slate-200 mx-1" />
        <button
          type="button"
          onClick={() => applyChip({ openHouses: local.openHouses === "true" ? "" : "true" })}
          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
            local.openHouses === "true"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
          }`}
        >
          Open Houses
        </button>
      </div>

      {expanded && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Min Price</label>
            <input
              type="number"
              placeholder="$0"
              value={local.minPrice}
              onChange={(e) => update("minPrice", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Max Price</label>
            <input
              type="number"
              placeholder="No max"
              value={local.maxPrice}
              onChange={(e) => update("maxPrice", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Beds (min)</label>
            <select
              value={local.beds}
              onChange={(e) => update("beds", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}+</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Baths (min)</label>
            <select
              value={local.baths}
              onChange={(e) => update("baths", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}+</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Property Type</label>
            <select
              value={local.propertyType}
              onChange={(e) => update("propertyType", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">All Types</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
            <input
              type="text"
              placeholder="e.g. Toronto"
              value={local.city}
              onChange={(e) => update("city", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Neighbourhood</label>
            <input
              type="text"
              placeholder="e.g. Yorkville"
              value={local.neighbourhood}
              onChange={(e) => update("neighbourhood", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Min Sqft</label>
            <input
              type="number"
              placeholder="0"
              value={local.minSqft}
              onChange={(e) => update("minSqft", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Max Sqft</label>
            <input
              type="number"
              placeholder="No max"
              value={local.maxSqft}
              onChange={(e) => update("maxSqft", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleReset}
              className="w-full px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 text-sm text-slate-500">
        {total.toLocaleString()} {total === 1 ? "listing" : "listings"} found
      </div>
    </form>
  );
}

export { INITIAL_FILTERS };
