import Link from "next/link";
import { AGENT, BROKERAGE } from "@/lib/reco";

// Header wordmark. Names the agent and brokerage at the top of every page that uses it
// (RECO Bulletins 5.1, 5.3); ComplianceFooter gives the full identification and address.
export default function BrandMark({ href }: { href?: string }) {
  const content = (
    <>
      <span className="block text-lg font-bold tracking-tight leading-tight">{AGENT}</span>
      <span className="block text-xs font-normal text-slate-300 leading-tight">{BROKERAGE}</span>
    </>
  );
  return href ? (
    <Link href={href} className="block whitespace-nowrap flex-shrink-0">
      {content}
    </Link>
  ) : (
    <div className="whitespace-nowrap flex-shrink-0">{content}</div>
  );
}
