"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Status = "NEW" | "CONTACTED" | "BOOKED" | "CLOSED";

interface ShowingRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  preferredTimes: string;
  message: string | null;
  status: Status;
  agentNotes: string | null;
  createdAt: string;
  listing: {
    id: string;
    mlsNumber: string;
    unitNumber: string | null;
    streetNumber: string | null;
    streetName: string | null;
    city: string | null;
    listPrice: string | number;
    status: string;
  };
  user: { id: string; approvalStatus: string } | null;
}

const STATUS_STYLES: Record<Status, string> = {
  NEW: "bg-amber-100 text-amber-800",
  CONTACTED: "bg-blue-100 text-blue-800",
  BOOKED: "bg-green-100 text-green-800",
  CLOSED: "bg-slate-100 text-slate-600",
};

const TABS: { label: string; value: Status | "OPEN" | "ALL" }[] = [
  { label: "Open", value: "OPEN" },
  { label: "New", value: "NEW" },
  { label: "Contacted", value: "CONTACTED" },
  { label: "Booked", value: "BOOKED" },
  { label: "Closed", value: "CLOSED" },
  { label: "All", value: "ALL" },
];

function formatPrice(p: string | number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Number(p));
}

function address(l: ShowingRequest["listing"]) {
  return [l.unitNumber && `${l.unitNumber} -`, l.streetNumber, l.streetName].filter(Boolean).join(" ");
}

export default function AgentShowingRequestsPage() {
  const [requests, setRequests] = useState<ShowingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("OPEN");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agent/showing-requests")
      .then((r) => r.json())
      .then((d) => setRequests(d.requests ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function update(id: string, data: { status?: Status; agentNotes?: string }) {
    setSaving(id);
    try {
      const res = await fetch("/api/agent/showing-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });
      if (res.ok) {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
      }
    } catch {
    } finally {
      setSaving(null);
    }
  }

  const visible = requests.filter((r) =>
    tab === "ALL" ? true : tab === "OPEN" ? r.status !== "CLOSED" : r.status === tab
  );
  const newCount = requests.filter((r) => r.status === "NEW").length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Showing Requests</h1>
        <p className="text-slate-500 mt-1">
          Showing requests from listing pages{newCount > 0 && ` · ${newCount} new`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.value ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-slate-400">Loading requests...</div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-slate-400 text-lg">No showing requests here</div>
          <p className="text-slate-400 text-sm mt-1">Requests from listing pages appear here and are emailed to you</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => (
            <div key={r.id} className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{r.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    {r.user ? (
                      <span className="text-xs text-slate-500">Portal client</span>
                    ) : (
                      <span className="text-xs text-slate-500">Visitor (no account)</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    <a href={`mailto:${r.email}`} className="underline">{r.email}</a>
                    {r.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${r.phone}`} className="underline">{r.phone}</a>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(r.createdAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                <select
                  value={r.status}
                  disabled={saving === r.id}
                  onChange={(e) => update(r.id, { status: e.target.value as Status })}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-900"
                >
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="BOOKED">Booked</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Listing</div>
                  <Link href={`/listings/${r.listing.mlsNumber}`} className="text-slate-900 underline">
                    {address(r.listing)}, {r.listing.city}
                  </Link>
                  <div className="text-slate-500">
                    {formatPrice(r.listing.listPrice)} · MLS® {r.listing.mlsNumber}
                    {r.listing.status !== "ACTIVE" && ` · now ${r.listing.status.toLowerCase()}`}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Preferred times</div>
                  <div className="text-slate-900 whitespace-pre-wrap">{r.preferredTimes}</div>
                </div>
                {r.message && (
                  <div className="sm:col-span-2">
                    <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Message</div>
                    <div className="text-slate-900 whitespace-pre-wrap">{r.message}</div>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Your notes</div>
                  <textarea
                    defaultValue={r.agentNotes ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (r.agentNotes ?? "")) update(r.id, { agentNotes: e.target.value });
                    }}
                    rows={2}
                    placeholder="Only you can see these"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
