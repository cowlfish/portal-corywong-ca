"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState({ searches: 0, favorites: 0, alerts: 0, transactions: 0 });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});

    Promise.all([
      fetch("/api/saved-searches").then((r) => r.json()),
      fetch("/api/favorites").then((r) => r.json()),
      fetch("/api/alerts").then((r) => r.json()),
      fetch("/api/transactions").then((r) => r.json()),
    ])
      .then(([s, f, a, t]) => {
        setStats({
          searches: s.searches?.length ?? 0,
          favorites: f.favorites?.length ?? 0,
          alerts: a.alerts?.filter((al: { readAt: string | null }) => !al.readAt)?.length ?? 0,
          transactions: t.transactions?.length ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  const cards = [
    {
      title: "Saved Searches",
      count: stats.searches,
      href: "/searches",
      description: "Your property search criteria",
      color: "bg-blue-50 border-blue-200 text-blue-700",
    },
    {
      title: "Favorites",
      count: stats.favorites,
      href: "/favorites",
      description: "Properties you've shortlisted",
      color: "bg-rose-50 border-rose-200 text-rose-700",
    },
    {
      title: "Unread Alerts",
      count: stats.alerts,
      href: "/alerts",
      description: "New listings matching your searches",
      color: "bg-amber-50 border-amber-200 text-amber-700",
    },
    {
      title: "Transactions",
      count: stats.transactions,
      href: "/transactions",
      description: "Your active transactions",
      color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {user ? `Welcome back, ${user.firstName}` : "Dashboard"}
        </h1>
        <p className="text-slate-500 mt-1">Your real estate portal at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`block p-6 rounded-lg border ${card.color} hover:shadow-md transition-shadow`}
          >
            <div className="text-3xl font-bold">{card.count}</div>
            <div className="font-semibold mt-1">{card.title}</div>
            <div className="text-sm opacity-75 mt-1">{card.description}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/searches"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
          >
            <span className="text-2xl">🔍</span>
            <div>
              <div className="font-medium text-slate-900">New Search</div>
              <div className="text-sm text-slate-500">Save search criteria</div>
            </div>
          </Link>
          <Link
            href="/favorites"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
          >
            <span className="text-2xl">❤️</span>
            <div>
              <div className="font-medium text-slate-900">My Shortlist</div>
              <div className="text-sm text-slate-500">View saved properties</div>
            </div>
          </Link>
          <Link
            href="/transactions"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-slate-400 transition-colors"
          >
            <span className="text-2xl">📋</span>
            <div>
              <div className="font-medium text-slate-900">My Transactions</div>
              <div className="text-sm text-slate-500">Track your deals</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
