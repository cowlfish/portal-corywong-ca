import Link from "next/link";
import ComplianceFooter from "@/components/ComplianceFooter";
import SearchBar from "@/components/listings/SearchBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">Cory Wong Real Estate</span>
          <div className="flex items-center gap-3">
            <Link
              href="/listings"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Property Search
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-white text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
            Your Real Estate Journey,<br />Organized
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-lg mx-auto">
            Search Toronto &amp; GTA properties from the MLS&reg; — save favourites,
            schedule tours, and get instant alerts.
          </p>

          <div className="mt-8 max-w-xl mx-auto">
            <SearchBar variant="hero" />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-400">
            <span>Popular:</span>
            <Link href="/listings?city=Toronto" className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-slate-400 transition-colors text-slate-600">
              Toronto
            </Link>
            <Link href="/listings?city=Mississauga" className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-slate-400 transition-colors text-slate-600">
              Mississauga
            </Link>
            <Link href="/listings?city=Brampton" className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-slate-400 transition-colors text-slate-600">
              Brampton
            </Link>
            <Link href="/listings?propertyType=Condo+Apt" className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-slate-400 transition-colors text-slate-600">
              Condos
            </Link>
            <Link href="/listings?propertyType=Detached" className="px-3 py-1 bg-white border border-slate-200 rounded-full hover:border-slate-400 transition-colors text-slate-600">
              Detached
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-2xl mb-3">🔍</div>
              <h3 className="font-semibold text-slate-900">Saved Searches</h3>
              <p className="text-sm text-slate-500 mt-1">
                Save your search criteria and get notified when matching properties hit the market.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-2xl mb-3">🗺️</div>
              <h3 className="font-semibold text-slate-900">Tour Scheduling</h3>
              <p className="text-sm text-slate-500 mt-1">
                Schedule and manage property showings with your agent in one place.
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="text-2xl mb-3">🔔</div>
              <h3 className="font-semibold text-slate-900">Property Alerts</h3>
              <p className="text-sm text-slate-500 mt-1">
                Get instant, daily, or weekly alerts when new listings match your criteria.
              </p>
            </div>
          </div>
        </div>
      </main>

      <ComplianceFooter />
    </div>
  );
}
