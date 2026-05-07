import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">Cory Wong Real Estate</span>
          <div className="flex items-center gap-3">
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
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
            Your Real Estate Journey,<br />Organized
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-lg mx-auto">
            Search properties, save your favorites, track transactions, and stay updated
            with alerts — all in one secure portal.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-6 py-3 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-md font-medium hover:bg-white transition-colors"
            >
              Sign In
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
              <div className="text-2xl mb-3">📋</div>
              <h3 className="font-semibold text-slate-900">Transaction Tracking</h3>
              <p className="text-sm text-slate-500 mt-1">
                View your transaction stages, documents, and key dates in one secure place.
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

      <footer className="py-6 text-center text-sm text-slate-400 border-t border-slate-200">
        &copy; {new Date().getFullYear()} Cory Wong Real Estate. All rights reserved.
      </footer>
    </div>
  );
}
