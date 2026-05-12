import PortalNav from "@/components/PortalNav";
import ComplianceFooter from "@/components/ComplianceFooter";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PortalNav />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
      <ComplianceFooter />
    </div>
  );
}
