"use client";

import { useEffect, useState } from "react";

interface Listing {
  id: string;
  mlsNumber: string;
  status: string;
  listPrice: string;
  streetNumber: string | null;
  streetName: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: string | null;
  propertyType: string | null;
  photos: { photoUrl: string }[];
}

interface Favorite {
  id: string;
  listingId: string;
  notes: string | null;
  createdAt: string;
  listing: Listing;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadFavorites() {
    const res = await fetch("/api/favorites");
    const data = await res.json();
    setFavorites(data.favorites || []);
    setLoading(false);
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  async function handleRemove(listingId: string) {
    await fetch(`/api/favorites?listingId=${listingId}`, { method: "DELETE" });
    loadFavorites();
  }

  if (loading) {
    return <div className="text-slate-500">Loading favorites...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
        <p className="text-slate-500 mt-1">Properties you&apos;ve added to your shortlist</p>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-lg">No favorites yet</p>
          <p className="text-slate-400 mt-1">
            Browse listings and add properties to your shortlist
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => {
            const l = fav.listing;
            const address = [l.streetNumber, l.streetName].filter(Boolean).join(" ");
            const photo = l.photos?.[0]?.photoUrl;

            return (
              <div key={fav.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 bg-slate-200 flex items-center justify-center">
                  {photo ? (
                    <img src={photo} alt={address} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 text-4xl">🏠</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        ${Number(l.listPrice).toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-600">{address || "Address TBD"}</div>
                      <div className="text-sm text-slate-500">{l.city}</div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        l.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                    {l.bedrooms != null && <span>{l.bedrooms} bed</span>}
                    {l.bathrooms != null && <span>{l.bathrooms} bath</span>}
                    {l.sqft && <span>{Number(l.sqft).toLocaleString()} sqft</span>}
                    {l.propertyType && <span>{l.propertyType}</span>}
                  </div>

                  <div className="text-xs text-slate-400 mt-2">MLS# {l.mlsNumber}</div>

                  {fav.notes && (
                    <div className="mt-2 text-sm text-slate-600 italic">&ldquo;{fav.notes}&rdquo;</div>
                  )}

                  <button
                    onClick={() => handleRemove(fav.listingId)}
                    className="mt-3 text-sm text-red-600 hover:text-red-800 transition-colors"
                  >
                    Remove from favorites
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
