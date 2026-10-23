import ComplianceFooter from "@/components/ComplianceFooter";
import { AGENT, BROKERAGE } from "@/lib/reco";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">{AGENT}</h1>
            <p className="text-sm text-slate-600 mt-1">{BROKERAGE}</p>
            <p className="text-slate-500 mt-3">Client Portal</p>
          </div>
          {children}
        </div>
      </div>
      <ComplianceFooter />
    </div>
  );
}
