"use client";

import { useEffect, useState, FormEvent } from "react";

interface SavedSearch {
  id: string;
  name: string;
  criteria: Record<string, unknown>;
  alertEnabled: boolean;
  alertFrequency: string;
  createdAt: string;
  updatedAt: string;
}

const PROPERTY_TYPES = [
  "Detached",
  "Semi-Detached",
  "Townhouse",
  "Condo Apartment",
  "Condo Townhouse",
  "Duplex",
  "Triplex",
  "Multiplex",
  "Vacant Land",
];

export default function SearchesPage() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadSearches() {
    const res = await fetch("/api/saved-searches");
    const data = await res.json();
    setSearches(data.searches || []);
    setLoading(false);
  }

  useEffect(() => {
    loadSearches();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const criteria: Record<string, unknown> = {};
    const city = form.get("city");
    if (city) criteria.city = city;
    const propertyType = form.get("propertyType");
    if (propertyType) criteria.propertyType = propertyType;
    const minPrice = form.get("minPrice");
    if (minPrice) criteria.minPrice = Number(minPrice);
    const maxPrice = form.get("maxPrice");
    if (maxPrice) criteria.maxPrice = Number(maxPrice);
    const minBeds = form.get("minBeds");
    if (minBeds) criteria.minBeds = Number(minBeds);
    const minBaths = form.get("minBaths");
    if (minBaths) criteria.minBaths = Number(minBaths);

    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        criteria,
        alertEnabled: form.get("alertEnabled") === "on",
        alertFrequency: form.get("alertFrequency") || "DAILY",
      }),
    });

    if (res.ok) {
      setShowForm(false);
      loadSearches();
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
    loadSearches();
  }

  function formatCriteria(criteria: Record<string, unknown>): string {
    const parts: string[] = [];
    if (criteria.city) parts.push(String(criteria.city));
    if (criteria.propertyType) parts.push(String(criteria.propertyType));
    if (criteria.minPrice || criteria.maxPrice) {
      const min = criteria.minPrice ? `$${Number(criteria.minPrice).toLocaleString()}` : "$0";
      const max = criteria.maxPrice ? `$${Number(criteria.maxPrice).toLocaleString()}` : "Any";
      parts.push(`${min} - ${max}`);
    }
    if (criteria.minBeds) parts.push(`${criteria.minBeds}+ beds`);
    if (criteria.minBaths) parts.push(`${criteria.minBaths}+ baths`);
    return parts.length > 0 ? parts.join(" · ") : "All properties";
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Saved Searches</h1>
          <p className="text-slate-500 mt-1">Save your search criteria and get alerted when new listings match</p>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-40 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-64" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Searches</h1>
          <p className="text-slate-500 mt-1">Save your search criteria and get alerted when new listings match</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition-colors"
        >
          {showForm ? "Cancel" : "+ New Search"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">New Saved Search</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search Name</label>
              <input
                name="name"
                required
                placeholder="e.g. Downtown Toronto Condos"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City / Area</label>
                <input
                  name="city"
                  placeholder="e.g. Toronto"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property Type</label>
                <select
                  name="propertyType"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Any</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Min Price</label>
                <input
                  name="minPrice"
                  type="number"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Price</label>
                <input
                  name="maxPrice"
                  type="number"
                  placeholder="Any"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Min Bedrooms</label>
                <select
                  name="minBeds"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Min Bathrooms</label>
                <select
                  name="minBaths"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="alertEnabled" className="rounded border-slate-300" />
                <span className="text-sm text-slate-700">Email alerts for new matches</span>
              </label>
              <select
                name="alertFrequency"
                className="px-3 py-1 border border-slate-300 rounded-md text-sm text-slate-900"
              >
                <option value="INSTANT">Instant</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition-colors"
            >
              Save Search
            </button>
          </form>
        </div>
      )}

      {searches.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-4">&#128269;</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No saved searches yet</h2>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">
            Save your search criteria and get notified when new listings match
            your preferences.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition-colors"
          >
            Create Your First Search
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((search) => (
            <div key={search.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900">{search.name}</div>
                <div className="text-sm text-slate-500 mt-0.5">{formatCriteria(search.criteria)}</div>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  {search.alertEnabled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                      Alerts: {search.alertFrequency.toLowerCase()}
                    </span>
                  )}
                  <span>Updated {new Date(search.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(search.id)}
                className="ml-4 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
