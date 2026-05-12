"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

interface Snapshot {
  snapshotDate: string;
  filters: Record<string, string | null> | null;
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
}

const PIE_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function SharedSnapshotPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/market-snapshot/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        Loading snapshot…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Snapshot not found</h1>
          <p className="text-slate-500">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  const activeFilters = data.filters
    ? Object.entries(data.filters).filter(([, v]) => v)
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">Cory Wong Real Estate</div>
            <div className="text-slate-400 text-sm">Market Snapshot</div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-sm rounded-md bg-slate-700 hover:bg-slate-600 print:hidden"
          >
            Print / PDF
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Market Snapshot</h1>
          <p className="text-slate-500 text-sm mt-1">
            Generated {new Date(data.snapshotDate).toLocaleDateString("en-CA", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {activeFilters.length > 0 && (
              <span>
                {" — "}
                {activeFilters.map(([k, v]) => `${k}: ${v}`).join(", ")}
              </span>
            )}
          </p>
        </div>

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

        <div className="text-xs text-slate-400 text-center mt-8 print:mt-4">
          Prepared by Cory Wong Real Estate — portal.corywong.ca
        </div>
      </main>
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
