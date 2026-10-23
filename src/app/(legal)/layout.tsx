import Link from "next/link";
import ComplianceFooter from "@/components/ComplianceFooter";
import BrandMark from "@/components/BrandMark";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <BrandMark href="/" />
          <Link href="/listings" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Property Search
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <article className="bg-white rounded-lg border border-slate-200 p-6 sm:p-10 text-slate-700 text-[15px] leading-relaxed space-y-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:pt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:underline">
          {children}
        </article>
      </main>
      <ComplianceFooter />
    </div>
  );
}
