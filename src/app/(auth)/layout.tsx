import ComplianceFooter from "@/components/ComplianceFooter";
import BrokerageBar from "@/components/BrokerageBar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <BrokerageBar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Cory Wong</h1>
            <p className="text-slate-500 mt-1">Client Portal</p>
          </div>
          {children}
        </div>
      </div>
      <ComplianceFooter />
    </div>
  );
}
