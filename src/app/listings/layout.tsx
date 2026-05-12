import Link from "next/link";
import type { Metadata } from "next";
import ComplianceFooter from "@/components/ComplianceFooter";
import SearchBar from "@/components/listings/SearchBar";

export const metadata: Metadata = {
  title: "Property Search — Cory Wong Real Estate",
  description:
    "Browse TRREB MLS listings. Search homes for sale in Toronto and the GTA with map view, filters, and full property details.",
};

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight whitespace-nowrap flex-shrink-0">
            Cory Wong Real Estate
          </Link>
          <div className="flex-1 max-w-xl hidden sm:block">
            <SearchBar variant="compact" />
          </div>
          <nav className="flex items-center gap-4 flex-shrink-0">
            <Link
              href="/listings"
              className="text-sm font-medium text-white hover:text-slate-300 transition-colors"
            >
              Search
            </Link>
            <Link
              href="/login"
              className="px-4 py-1.5 text-sm font-medium bg-white text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <ComplianceFooter />
    </div>
  );
}
