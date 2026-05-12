"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalClients: number;
  pendingApprovals: number;
  clientGroups: number;
  tours: number;
  savedSearches: number;
  favorites: number;
}

export default function AgentDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Clients", value: stats?.totalClients ?? 0, color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
    { label: "Pending Approvals", value: stats?.pendingApprovals ?? 0, color: "bg-amber-50 border-amber-200 text-amber-700" },
    { label: "Client Groups", value: stats?.clientGroups ?? 0, color: "bg-violet-50 border-violet-200 text-violet-700" },
    { label: "Tours", value: stats?.tours ?? 0, color: "bg-blue-50 border-blue-200 text-blue-700" },
    { label: "Saved Searches", value: stats?.savedSearches ?? 0, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
    { label: "Favorites", value: stats?.favorites ?? 0, color: "bg-rose-50 border-rose-200 text-rose-700" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Agent Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your client portal activity</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 rounded-lg border border-slate-200 animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-16 mb-2" />
              <div className="h-5 bg-slate-200 rounded w-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className={`p-6 rounded-lg border ${card.color}`}
            >
              <div className="text-3xl font-bold">{card.value}</div>
              <div className="font-semibold mt-1">{card.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
