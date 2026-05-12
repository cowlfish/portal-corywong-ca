"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface FeatureFlags {
  messagingEnabled: boolean;
  transactionsEnabled: boolean;
  ampreFeedLive: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  featureFlag?: keyof FeatureFlags;
  agentOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/listings", label: "Property Search", icon: "🏘️" },
  { href: "/searches", label: "Saved Searches", icon: "🔍" },
  { href: "/favorites", label: "My Lists", icon: "❤️" },
  { href: "/alerts", label: "Alerts", icon: "🔔" },
  { href: "/tours", label: "Tours", icon: "🗺️" },
  { href: "/market-snapshot", label: "Market", icon: "📊" },
  { href: "/cma", label: "CMA", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "📋", featureFlag: "transactionsEnabled" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️", agentOnly: true },
];

export default function PortalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags>({
    messagingEnabled: false,
    transactionsEnabled: false,
    ampreFeedLive: false,
  });
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/feature-flags")
      .then((r) => r.json())
      .then(setFlags)
      .catch(() => {});

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserRole(d.user?.role ?? null))
      .catch(() => {});
  }, []);

  const isAgent = userRole === "AGENT" || userRole === "ADMIN";

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.agentOnly && !isAgent) return false;
    if (item.featureFlag && !flags[item.featureFlag]) return false;
    return true;
  });

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <>
      <nav className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="text-lg font-bold tracking-tight">
                Cory Wong Real Estate
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-slate-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-md text-slate-300 hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname === item.href
                      ? "bg-slate-700 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
