"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

type Tab = "search" | "selected" | "sold" | "summary";

interface Listing {
  id: string;
  mlsNumber: string;
  listPrice: string;
  streetNumber: string | null;
  streetName: string | null;
  unitNumber: string | null;
  city: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: string | null;
  daysOnMarket: number | null;
  photos: { photoUrl: string }[];
  selected?: boolean;
}

interface CmaComp {
  id: string;
  listingId: string;
  notes: string | null;
  listing: Listing;
}

interface SoldComp {
  id: string;
  address: string;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: string | null;
  soldPrice: string;
  soldDate: string;
  listPrice: string | null;
  daysOnMarket: number | null;
  notes: string | null;
  source: string;
}

interface Report {
  id: string;
  name: string;
  status: string;
  subjectAddress: string | null;
  subjectPropertyType: string | null;
  subjectBedrooms: number | null;
  subjectBathrooms: number | null;
  subjectSqft: string | null;
  subjectListPrice: string | null;
  notes: string | null;
  comps: CmaComp[];
  soldComps: SoldComp[];
}

interface Stats {
  min: number;
  max: number;
  avg: number;
  median: number;
  count: number;
}

interface SummaryData {
  report: Partial<Report>;
  activeComps: { count: number; price: Stats | null; pricePerSqft: Stats | null; daysOnMarket: Stats | null; sqft: Stats | null; listings: Listing[] };
  soldComps: { count: number; price: Stats | null; pricePerSqft: Stats | null; daysOnMarket: Stats | null; sqft: Stats | null; entries: SoldComp[] };
}

function formatPrice(n: number | string | null | undefined): string {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

function formatAddr(l: { streetNumber?: string | null; streetName?: string | null; unitNumber?: string | null; city?: string | null }): string {
  const parts = [l.unitNumber ? `${l.unitNumber}-` : "", l.streetNumber, l.streetName].filter(Boolean).join(" ");
  return l.city ? `${parts}, ${l.city}` : parts;
}

export default function CmaBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [tab, setTab] = useState<Tab>("search");
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(() => {
    fetch(`/api/cma/${id}`)
      .then((r) => r.json())
      .then((d) => setReport(d.report || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadReport(); }, [loadReport]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="text-slate-500">Loading CMA...</div></div>;
  }
  if (!report) {
    return <div className="text-center py-20"><h2 className="text-xl font-semibold text-slate-900">CMA report not found</h2><Link href="/cma" className="text-slate-500 hover:text-slate-700 mt-2 inline-block">Back to reports</Link></div>;
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "search", label: "Search Comps" },
    { key: "selected", label: "Selected", count: report.comps.length },
    { key: "sold", label: "Sold Comps", count: report.soldComps.length },
    { key: "summary", label: "Summary" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/cma" className="hover:text-slate-700">CMA Reports</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{report.name}</h1>
          {report.subjectAddress && <p className="text-slate-500 text-sm mt-0.5">{report.subjectAddress}</p>}
        </div>
        <SubjectEditor report={report} onSave={loadReport} />
      </div>

      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              {t.count != null && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{t.count}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {tab === "search" && <CompSearch reportId={id} onAdd={loadReport} selectedIds={new Set(report.comps.map((c) => c.listingId))} />}
      {tab === "selected" && <SelectedComps report={report} onRemove={loadReport} />}
      {tab === "sold" && <SoldComps reportId={id} soldComps={report.soldComps} onUpdate={loadReport} />}
      {tab === "summary" && <CmaSummary reportId={id} />}
    </div>
  );
}

function SubjectEditor({ report, onSave }: { report: Report; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subjectAddress: report.subjectAddress || "",
    subjectPropertyType: report.subjectPropertyType || "",
    subjectBedrooms: report.subjectBedrooms?.toString() || "",
    subjectBathrooms: report.subjectBathrooms?.toString() || "",
    subjectSqft: report.subjectSqft?.toString() || "",
    subjectListPrice: report.subjectListPrice?.toString() || "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/cma/${report.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectAddress: form.subjectAddress || null,
        subjectPropertyType: form.subjectPropertyType || null,
        subjectBedrooms: form.subjectBedrooms ? Number(form.subjectBedrooms) : null,
        subjectBathrooms: form.subjectBathrooms ? Number(form.subjectBathrooms) : null,
        subjectSqft: form.subjectSqft ? Number(form.subjectSqft) : null,
        subjectListPrice: form.subjectListPrice ? Number(form.subjectListPrice) : null,
      }),
    });
    setSaving(false);
    setOpen(false);
    onSave();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-3 py-1.5 border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        {report.subjectAddress ? "Edit Subject" : "Set Subject Property"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Subject Property</h3>
        <div className="space-y-3">
          <input value={form.subjectAddress} onChange={(e) => setForm({ ...form, subjectAddress: e.target.value })} placeholder="Address" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
          <input value={form.subjectPropertyType} onChange={(e) => setForm({ ...form, subjectPropertyType: e.target.value })} placeholder="Property type" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.subjectBedrooms} onChange={(e) => setForm({ ...form, subjectBedrooms: e.target.value })} placeholder="Beds" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
            <input type="number" value={form.subjectBathrooms} onChange={(e) => setForm({ ...form, subjectBathrooms: e.target.value })} placeholder="Baths" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.subjectSqft} onChange={(e) => setForm({ ...form, subjectSqft: e.target.value })} placeholder="Sqft" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
            <input type="number" value={form.subjectListPrice} onChange={(e) => setForm({ ...form, subjectListPrice: e.target.value })} placeholder="List price" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CompSearch({ reportId, onAdd, selectedIds }: { reportId: string; onAdd: () => void; selectedIds: Set<string> }) {
  const [filters, setFilters] = useState({ city: "", community: "", propertyType: "", bedsMin: "", bedsMax: "", bathsMin: "", priceMin: "", priceMax: "", sqftMin: "", sqftMax: "", buildingName: "" });
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [adding, setAdding] = useState<Set<string>>(new Set());

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    try {
      const res = await fetch(`/api/cma/${reportId}/comps?${params}`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotal(data.total || 0);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  async function toggleComp(listing: Listing) {
    const isSelected = selectedIds.has(listing.id);
    setAdding((prev) => new Set([...prev, listing.id]));
    try {
      if (isSelected) {
        await fetch(`/api/cma/${reportId}/comps`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: listing.id }),
        });
      } else {
        await fetch(`/api/cma/${reportId}/comps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: listing.id }),
        });
      }
      onAdd();
    } finally {
      setAdding((prev) => { const n = new Set(prev); n.delete(listing.id); return n; });
    }
  }

  const f = (k: keyof typeof filters, v: string) => setFilters({ ...filters, [k]: v });

  return (
    <div>
      <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <input value={filters.city} onChange={(e) => f("city", e.target.value)} placeholder="City" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          <input value={filters.community} onChange={(e) => f("community", e.target.value)} placeholder="Community" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          <input value={filters.propertyType} onChange={(e) => f("propertyType", e.target.value)} placeholder="Property type" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          <input value={filters.buildingName} onChange={(e) => f("buildingName", e.target.value)} placeholder="Building name" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
          <input type="number" value={filters.bedsMin} onChange={(e) => f("bedsMin", e.target.value)} placeholder="Beds min" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          <input type="number" value={filters.bedsMax} onChange={(e) => f("bedsMax", e.target.value)} placeholder="Beds max" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          <input type="number" value={filters.bathsMin} onChange={(e) => f("bathsMin", e.target.value)} placeholder="Baths min" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          <input type="number" value={filters.priceMin} onChange={(e) => f("priceMin", e.target.value)} placeholder="Price min" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          <input type="number" value={filters.priceMax} onChange={(e) => f("priceMax", e.target.value)} placeholder="Price max" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          <input type="number" value={filters.sqftMin} onChange={(e) => f("sqftMin", e.target.value)} placeholder="Sqft min" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
        </div>
        <div className="flex items-center justify-between">
          <button type="submit" disabled={searching} className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
            {searching ? "Searching..." : "Search Active Listings"}
          </button>
          {searched && <span className="text-sm text-slate-500">{total} result{total !== 1 ? "s" : ""}</span>}
        </div>
      </form>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
        <strong>IDX limitation:</strong> Only active listings are available from the feed. Sold data requires VOW access (Phase 2). Use the &quot;Sold Comps&quot; tab to manually add sold comparables.
      </div>

      {listings.length > 0 && (
        <div className="space-y-2">
          {listings.map((l) => {
            const isSelected = selectedIds.has(l.id);
            return (
              <div key={l.id} className={`bg-white border rounded-lg p-4 flex items-center gap-4 ${isSelected ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200"}`}>
                <div className="w-16 h-16 rounded bg-slate-100 flex-shrink-0 overflow-hidden">
                  {l.photos[0] ? (
                    <img src={l.photos[0].photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No photo</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm">{formatAddr(l)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    MLS# {l.mlsNumber} &middot; {l.propertyType || "—"} &middot; {l.bedrooms ?? "—"} bed &middot; {l.bathrooms ?? "—"} bath &middot; {l.sqft ? `${Number(l.sqft).toLocaleString()} sqft` : "—"}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-slate-900">{formatPrice(l.listPrice)}</div>
                  {l.sqft && Number(l.sqft) > 0 && (
                    <div className="text-xs text-slate-500">{formatPrice(Number(l.listPrice) / Number(l.sqft))}/sqft</div>
                  )}
                  {l.daysOnMarket != null && <div className="text-xs text-slate-500">{l.daysOnMarket} DOM</div>}
                </div>
                <button
                  onClick={() => toggleComp(l)}
                  disabled={adding.has(l.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium flex-shrink-0 transition-colors ${
                    isSelected
                      ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  } disabled:opacity-50`}
                >
                  {adding.has(l.id) ? "..." : isSelected ? "Remove" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectedComps({ report, onRemove }: { report: Report; onRemove: () => void }) {
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  async function handleRemove(listingId: string) {
    setRemoving((prev) => new Set([...prev, listingId]));
    try {
      await fetch(`/api/cma/${report.id}/comps`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      onRemove();
    } finally {
      setRemoving((prev) => { const n = new Set(prev); n.delete(listingId); return n; });
    }
  }

  if (report.comps.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">No comps selected</h3>
        <p className="text-slate-500 text-sm">Use the Search tab to find and add active listing comparables.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-700 mb-3">{report.comps.length} active comp{report.comps.length !== 1 ? "s" : ""} selected</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
              <th className="pb-2 pr-4">Address</th>
              <th className="pb-2 pr-4">MLS#</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4">Bed/Bath</th>
              <th className="pb-2 pr-4">Sqft</th>
              <th className="pb-2 pr-4">List Price</th>
              <th className="pb-2 pr-4">$/sqft</th>
              <th className="pb-2 pr-4">DOM</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {report.comps.map((c) => {
              const l = c.listing;
              const ppsf = l.sqft && Number(l.sqft) > 0 ? Number(l.listPrice) / Number(l.sqft) : null;
              return (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 font-medium">{formatAddr(l)}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{l.mlsNumber}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{l.propertyType || "—"}</td>
                  <td className="py-2.5 pr-4">{l.bedrooms ?? "—"}/{l.bathrooms ?? "—"}</td>
                  <td className="py-2.5 pr-4">{l.sqft ? Number(l.sqft).toLocaleString() : "—"}</td>
                  <td className="py-2.5 pr-4 font-medium">{formatPrice(l.listPrice)}</td>
                  <td className="py-2.5 pr-4">{ppsf ? formatPrice(ppsf) : "—"}</td>
                  <td className="py-2.5 pr-4">{l.daysOnMarket ?? "—"}</td>
                  <td className="py-2.5">
                    <button
                      onClick={() => handleRemove(c.listingId)}
                      disabled={removing.has(c.listingId)}
                      className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SoldComps({ reportId, soldComps, onUpdate }: { reportId: string; soldComps: SoldComp[]; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ address: "", propertyType: "", bedrooms: "", bathrooms: "", sqft: "", soldPrice: "", soldDate: "", listPrice: "", daysOnMarket: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address || !form.soldPrice || !form.soldDate) return;
    setSaving(true);
    try {
      await fetch(`/api/cma/${reportId}/sold-comps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          propertyType: form.propertyType || null,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
          sqft: form.sqft ? Number(form.sqft) : null,
          soldPrice: Number(form.soldPrice),
          soldDate: form.soldDate,
          listPrice: form.listPrice ? Number(form.listPrice) : null,
          daysOnMarket: form.daysOnMarket ? Number(form.daysOnMarket) : null,
          notes: form.notes || null,
        }),
      });
      setForm({ address: "", propertyType: "", bedrooms: "", bathrooms: "", sqft: "", soldPrice: "", soldDate: "", listPrice: "", daysOnMarket: "", notes: "" });
      setShowForm(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(soldCompId: string) {
    setDeleting((prev) => new Set([...prev, soldCompId]));
    try {
      await fetch(`/api/cma/${reportId}/sold-comps/${soldCompId}`, { method: "DELETE" });
      onUpdate();
    } finally {
      setDeleting((prev) => { const n = new Set(prev); n.delete(soldCompId); return n; });
    }
  }

  const ff = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
        <strong>Manual entry only:</strong> Sold data is not available from the IDX feed. Enter sold comparables manually from your records or MLS access. When VOW is active, sold comps will be pulled automatically.
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-700">{soldComps.length} sold comp{soldComps.length !== 1 ? "s" : ""}</h3>
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800">
          Add Sold Comp
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-slate-900 mb-3">New Sold Comparable</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <input value={form.address} onChange={(e) => ff("address", e.target.value)} placeholder="Address *" className="col-span-2 md:col-span-3 px-3 py-2 border border-slate-300 rounded-md text-sm" required />
            <input value={form.propertyType} onChange={(e) => ff("propertyType", e.target.value)} placeholder="Property type" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
            <input type="number" value={form.bedrooms} onChange={(e) => ff("bedrooms", e.target.value)} placeholder="Beds" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
            <input type="number" value={form.bathrooms} onChange={(e) => ff("bathrooms", e.target.value)} placeholder="Baths" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
            <input type="number" value={form.sqft} onChange={(e) => ff("sqft", e.target.value)} placeholder="Sqft" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
            <input type="number" value={form.soldPrice} onChange={(e) => ff("soldPrice", e.target.value)} placeholder="Sold price *" className="px-3 py-2 border border-slate-300 rounded-md text-sm" required />
            <input type="date" value={form.soldDate} onChange={(e) => ff("soldDate", e.target.value)} className="px-3 py-2 border border-slate-300 rounded-md text-sm" required />
            <input type="number" value={form.listPrice} onChange={(e) => ff("listPrice", e.target.value)} placeholder="List price" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
            <input type="number" value={form.daysOnMarket} onChange={(e) => ff("daysOnMarket", e.target.value)} placeholder="Days on market" className="px-3 py-2 border border-slate-300 rounded-md text-sm" />
          </div>
          <textarea value={form.notes} onChange={(e) => ff("notes", e.target.value)} placeholder="Notes (optional)" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-3" rows={2} />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
              {saving ? "Adding..." : "Add Sold Comp"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {soldComps.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                <th className="pb-2 pr-4">Address</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Bed/Bath</th>
                <th className="pb-2 pr-4">Sqft</th>
                <th className="pb-2 pr-4">Sold Price</th>
                <th className="pb-2 pr-4">$/sqft</th>
                <th className="pb-2 pr-4">Sold Date</th>
                <th className="pb-2 pr-4">DOM</th>
                <th className="pb-2 pr-4">Source</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {soldComps.map((s) => {
                const ppsf = s.sqft && Number(s.sqft) > 0 ? Number(s.soldPrice) / Number(s.sqft) : null;
                return (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-4 font-medium">{s.address}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{s.propertyType || "—"}</td>
                    <td className="py-2.5 pr-4">{s.bedrooms ?? "—"}/{s.bathrooms ?? "—"}</td>
                    <td className="py-2.5 pr-4">{s.sqft ? Number(s.sqft).toLocaleString() : "—"}</td>
                    <td className="py-2.5 pr-4 font-medium">{formatPrice(s.soldPrice)}</td>
                    <td className="py-2.5 pr-4">{ppsf ? formatPrice(ppsf) : "—"}</td>
                    <td className="py-2.5 pr-4">{new Date(s.soldDate).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-4">{s.daysOnMarket ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{s.source === "MANUAL" ? "Manual" : "Feed"}</span>
                    </td>
                    <td className="py-2.5">
                      <button onClick={() => handleDelete(s.id)} disabled={deleting.has(s.id)} className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50">
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CmaSummary({ reportId }: { reportId: string }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch(`/api/cma/${reportId}/summary`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reportId]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/cma/${reportId}/export`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cma-${reportId}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="text-slate-500 py-8 text-center">Loading summary...</div>;
  if (!data) return <div className="text-slate-500 py-8 text-center">Failed to load summary.</div>;

  const { report, activeComps, soldComps } = data;

  function StatsCard({ title, stats, color }: { title: string; stats: Stats | null; color: string }) {
    if (!stats) return null;
    return (
      <div className={`border rounded-lg p-4 ${color}`}>
        <h4 className="text-xs font-medium uppercase tracking-wider opacity-75 mb-2">{title}</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="opacity-60">Min:</span> <span className="font-medium">{formatPrice(stats.min)}</span></div>
          <div><span className="opacity-60">Max:</span> <span className="font-medium">{formatPrice(stats.max)}</span></div>
          <div><span className="opacity-60">Avg:</span> <span className="font-medium">{formatPrice(stats.avg)}</span></div>
          <div><span className="opacity-60">Med:</span> <span className="font-medium">{formatPrice(stats.median)}</span></div>
        </div>
      </div>
    );
  }

  function DomCard({ title, stats, color }: { title: string; stats: Stats | null; color: string }) {
    if (!stats) return null;
    return (
      <div className={`border rounded-lg p-4 ${color}`}>
        <h4 className="text-xs font-medium uppercase tracking-wider opacity-75 mb-2">{title}</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="opacity-60">Min:</span> <span className="font-medium">{stats.min}</span></div>
          <div><span className="opacity-60">Max:</span> <span className="font-medium">{stats.max}</span></div>
          <div><span className="opacity-60">Avg:</span> <span className="font-medium">{stats.avg}</span></div>
          <div><span className="opacity-60">Med:</span> <span className="font-medium">{stats.median}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">CMA Summary</h3>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export to PDF"}
        </button>
      </div>

      {report.subjectAddress && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Subject Property</h4>
          <div className="font-medium text-slate-900">{report.subjectAddress}</div>
          <div className="flex gap-4 mt-1 text-sm text-slate-600">
            {report.subjectPropertyType && <span>{report.subjectPropertyType}</span>}
            {report.subjectBedrooms != null && <span>{report.subjectBedrooms} bed</span>}
            {report.subjectBathrooms != null && <span>{report.subjectBathrooms} bath</span>}
            {report.subjectSqft && <span>{Number(report.subjectSqft).toLocaleString()} sqft</span>}
            {report.subjectListPrice && <span className="font-medium">{formatPrice(report.subjectListPrice)}</span>}
          </div>
        </div>
      )}

      {activeComps.count > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-slate-900 mb-3">Active Comparables ({activeComps.count})</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatsCard title="Price Range" stats={activeComps.price} color="bg-blue-50 border-blue-200 text-blue-900" />
            <StatsCard title="Price / Sqft" stats={activeComps.pricePerSqft} color="bg-indigo-50 border-indigo-200 text-indigo-900" />
            <DomCard title="Days on Market" stats={activeComps.daysOnMarket} color="bg-purple-50 border-purple-200 text-purple-900" />
          </div>
        </div>
      )}

      {soldComps.count > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-slate-900 mb-3">Sold Comparables ({soldComps.count})</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatsCard title="Sold Price Range" stats={soldComps.price} color="bg-emerald-50 border-emerald-200 text-emerald-900" />
            <StatsCard title="Sold Price / Sqft" stats={soldComps.pricePerSqft} color="bg-teal-50 border-teal-200 text-teal-900" />
            <DomCard title="Days on Market" stats={soldComps.daysOnMarket} color="bg-cyan-50 border-cyan-200 text-cyan-900" />
          </div>
        </div>
      )}

      {activeComps.count === 0 && soldComps.count === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No comparables yet</h3>
          <p className="text-slate-500 text-sm">Add active and sold comparables to see the summary analysis.</p>
        </div>
      )}
    </div>
  );
}
