"use client";

import { use, useEffect, useState } from "react";

interface TourStop {
  address: string;
  city: string | null;
  province: string | null;
  postalCode: string | null;
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
  latitude: string | null;
  longitude: string | null;
}

interface SharedTour {
  title: string;
  clientName: string | null;
  tourDate: string | null;
  notes: string | null;
  status: string;
  agent: { firstName: string; lastName: string; email: string; phone: string | null };
  stops: TourStop[];
}

export default function SharedTourPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [tour, setTour] = useState<SharedTour | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/tours/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => setTour(d.tour))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400">Loading tour...</div>
      </div>
    );
  }

  if (notFound || !tour) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Tour Not Found</h1>
          <p className="text-slate-500">This tour link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{tour.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
            {tour.clientName && <span>Prepared for: {tour.clientName}</span>}
            {tour.tourDate && (
              <span>
                {new Date(tour.tourDate).toLocaleDateString("en-CA", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
            <span>{tour.stops.length} properties</span>
          </div>
          {tour.notes && <p className="mt-3 text-sm text-slate-600">{tour.notes}</p>}
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
            <p className="font-medium">
              Your Agent: {tour.agent.firstName} {tour.agent.lastName}
            </p>
            <p>
              {tour.agent.email}
              {tour.agent.phone && ` | ${tour.agent.phone}`}
            </p>
          </div>
        </div>

        {/* Print Button */}
        <div className="flex justify-end mb-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm"
          >
            Print / Save PDF
          </button>
        </div>

        {/* Stops */}
        <div className="space-y-4">
          {tour.stops.map((stop, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg border border-slate-200 p-4 print:break-inside-avoid"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {idx + 1}
                </div>

                {stop.photoUrl && (
                  <img
                    src={stop.photoUrl}
                    alt=""
                    className="w-28 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">{stop.address}</h3>
                  <div className="text-sm text-slate-500">
                    {[stop.city, stop.province, stop.postalCode].filter(Boolean).join(", ")}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                    {stop.listPrice && <span>${Number(stop.listPrice).toLocaleString()}</span>}
                    {stop.bedrooms != null && <span>{stop.bedrooms} bed</span>}
                    {stop.bathrooms != null && <span>{stop.bathrooms} bath</span>}
                    {stop.propertyType && <span>{stop.propertyType}</span>}
                    {stop.mlsNumber && <span>MLS# {stop.mlsNumber}</span>}
                  </div>
                  {stop.scheduledTime && (
                    <div className="mt-1 text-sm font-medium text-blue-600">
                      {new Date(stop.scheduledTime).toLocaleTimeString("en-CA", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {stop.duration && ` (${stop.duration} min)`}
                    </div>
                  )}
                  {stop.notes && (
                    <div className="mt-1 text-sm text-slate-600 italic">{stop.notes}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400 print:mt-12">
          <p>Cory Wong Real Estate</p>
        </div>
      </div>
    </div>
  );
}
