import { AGENT, BROKERAGE } from "@/lib/reco";

// Brokerage identification near the top of every public page (RECO Bulletins 5.1, 5.3);
// ComplianceFooter repeats it at the bottom.
export default function BrokerageBar() {
  return (
    <div className="bg-slate-800 text-slate-200 text-xs text-center py-1.5 px-4">
      {AGENT}. {BROKERAGE}.
    </div>
  );
}
