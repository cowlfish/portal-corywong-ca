"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TourStop {
  id: string;
  address: string;
  city: string | null;
}

interface Tour {
  id: string;
  title: string;
  clientName: string | null;
  tourDate: string | null;
  status: string;
  stops: TourStop[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  SCHEDULED: { label: "Scheduled", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

export default function ToursPage() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/tours")
      .then((r) => r.json())
      .then((d) => setTours(d.tours || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Tour — ${new Date().toLocaleDateString("en-CA")}` }),
      });
      const data = await res.json();
      if (data.tour) {
        router.push(`/tours/${data.tour.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(tourId: string) {
    if (!confirm("Delete this tour?")) return;
    await fetch(`/api/tours/${tourId}`, { method: "DELETE" });
    setTours((prev) => prev.filter((t) => t.id !== tourId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading tours...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Showing Tours</h1>
          <p className="text-slate-500 mt-1">Plan and manage property showing tours for clients</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {creating ? "Creating..." : "New Tour"}
        </button>
      </div>

      {tours.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No tours yet</h2>
          <p className="text-slate-500 mb-6">
            Create a showing tour to plan property visits for your clients.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Create Your First Tour
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {tours.map((tour) => {
            const st = STATUS_LABELS[tour.status] || STATUS_LABELS.DRAFT;
            return (
              <div
                key={tour.id}
                className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Link
                        href={`/tours/${tour.id}`}
                        className="text-lg font-semibold text-slate-900 hover:text-blue-600 truncate"
                      >
                        {tour.title}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      {tour.clientName && <span>Client: {tour.clientName}</span>}
                      {tour.tourDate && (
                        <span>{new Date(tour.tourDate).toLocaleDateString("en-CA")}</span>
                      )}
                      <span>{tour.stops.length} {tour.stops.length === 1 ? "stop" : "stops"}</span>
                    </div>
                    {tour.stops.length > 0 && (
                      <div className="mt-2 text-sm text-slate-400 truncate">
                        {tour.stops.map((s) => s.address).join(" → ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/tours/${tour.id}`}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(tour.id)}
                      className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
