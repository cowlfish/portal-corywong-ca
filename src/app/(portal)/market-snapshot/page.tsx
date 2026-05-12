"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DistItem {
  label: string;
  count: number;
}

interface SnapshotData {
  activeCount: number;
  avgListPrice: number;
  medianListPrice: number;
  avgPricePerSqft: number | null;
  avgDaysOnMarket: number | null;
  medianDaysOnMarket: number | null;
  priceDistribution: DistItem[];
  domDistribution: DistItem[];
  propertyTypeCounts: DistItem[];
  areaCounts: DistItem[];
  filters: Record<string, string | null>;
  generatedAt: string;
}

interface FilterOptions {
  areas: string[];
  neighbourhoods: string[];
  propertyTypes: string[];
}

const PIE_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

const PRICE_BANDS = [
  { label: "Any", value: "", min: "", max: "" },
  { label: "Under $500K", value: "0-500000", min: "0", max: "500000" },
  { label: "$500K–$750K", value: "500000-750000", min: "500000", max: "750000" },
  { label: "$750K–$1M", value: "750000-1000000", min: "750000", max: "1000000" },
  { label: "$1M–$1.5M", value: "1000000-1500000", min: "1000000", max: "1500000" },
  { label: "$1.5M–$2M", value: "1500000-2000000", min: "1500000", max: "2000000" },
  { label: "$2M+", value: "2000000-", min: "2000000", max: "" },
];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function MarketSnapshotPage() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [filterOpts, setFilterOpts] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const [area, setArea] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceBand, setPriceBand] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [minBaths, setMinBaths] = useState("");

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/market-snapshot/filters")
      .then((r) => r.json())
      .then(setFilterOpts)
      .catch(() => {});
  }, []);

  const fetchSnapshot = useCallback(() => {
    setLoading(true);
    setShareUrl(null);
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (neighbourhood) params.set("neighbourhood", neighbourhood);
    if (propertyType) params.set("propertyType", propertyType);
    const band = PRICE_BANDS.find((b) => b.value === priceBand);
    if (band && "min" in band && band.min) params.set("minPrice", band.min);
    if (band && "max" in band && band.max) params.set("maxPrice", band.max);
    if (minBeds) params.set("minBeds", minBeds);
    if (minBaths) params.set("minBaths", minBaths);

    fetch(`/api/market-snapshot?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [area, neighbourhood, propertyType, priceBand, minBeds, minBaths]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  async function handleSaveAndShare() {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/market-snapshot/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.shareToken) {
        const url = `${window.location.origin}/snapshot/${result.shareToken}`;
        setShareUrl(url);
        await navigator.clipboard.writeText(url).catch(() => {});
      }
    } catch {
      // ignore
    }
    setSaving(false);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div ref={printRef}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Market Snapshot</h1>
          <p className="text-slate-500 mt-1">Active inventory overview — point-in-time</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          >
            Export PDF
          </button>
          <button
            onClick={handleSaveAndShare}
            disabled={saving || !data || data.activeCount === 0}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Share Snapshot"}
          </button>
        </div>
      </div>

      {shareUrl && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm print:hidden">
          <span className="font-medium text-emerald-800">Link copied!</span>{" "}
          <a href={shareUrl} className="text-emerald-700 underline break-all" target="_blank" rel="noopener">
            {shareUrl}
          </a>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 print:hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Area</label>
            <select
              value={area}
              onChange={(e) => { setArea(e.target.value); setNeighbourhood(""); }}
              className="w-full rounded-md border border-slate-300 text-sm py-1.5 px-2"
            >
              <option value="">All Areas</option>
              {filterOpts?.areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Neighbourhood</label>
            <select
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              className="w-full rounded-md border border-slate-300 text-sm py-1.5 px-2"
            >
              <option value="">All</option>
              {filterOpts?.neighbourhoods.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Property Type</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full rounded-md border border-slate-300 text-sm py-1.5 px-2"
            >
              <option value="">All Types</option>
              {filterOpts?.propertyTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Price Band</label>
            <select
              value={priceBand}
              onChange={(e) => setPriceBand(e.target.value)}
              className="w-full rounded-md border border-slate-300 text-sm py-1.5 px-2"
            >
              {PRICE_BANDS.map((b, i) => (
                <option key={i} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Min Beds</label>
            <select
              value={minBeds}
              onChange={(e) => setMinBeds(e.target.value)}
              className="w-full rounded-md border border-slate-300 text-sm py-1.5 px-2"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}+</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Min Baths</label>
            <select
              value={minBaths}
              onChange={(e) => setMinBaths(e.target.value)}
              className="w-full rounded-md border border-slate-300 text-sm py-1.5 px-2"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}+</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading snapshot…</div>
      ) : !data ? (
        <div className="text-center py-16 text-slate-400">Failed to load data</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <MetricCard label="Active Listings" value={data.activeCount.toLocaleString()} />
            <MetricCard label="Avg List Price" value={fmt(data.avgListPrice)} />
            <MetricCard label="Median List Price" value={fmt(data.medianListPrice)} />
            <MetricCard
              label="Avg $/sqft"
              value={data.avgPricePerSqft ? fmt(data.avgPricePerSqft) : "N/A"}
            />
            <MetricCard
              label="Median DOM"
              value={data.medianDaysOnMarket != null ? `${data.medianDaysOnMarket} days` : "N/A"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ChartCard title="Price Distribution">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.priceDistribution} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Days on Market Distribution">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.domDistribution} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ChartCard title="By Property Type">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.propertyTypeCounts.slice(0, 10)}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {data.propertyTypeCounts.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top Areas by Inventory">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.areaCounts.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 8, right: 16, bottom: 0, left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={75} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="text-xs text-slate-400 text-right print:text-left">
            Generated {new Date(data.generatedAt).toLocaleString("en-CA")}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
