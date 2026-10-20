import type { Metadata } from "next";
import Link from "next/link";
import { AGENT, BROKERAGE } from "@/lib/reco";

export const metadata: Metadata = {
  title: "Terms of Use | Cory Wong, Broker, Trustwell Realty Inc., Brokerage",
};

const LAST_UPDATED = "October 20, 2026";

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p className="text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

      <p>
        These terms apply to the client portal at portal.corywong.ca (the &quot;Portal&quot;), provided by {AGENT},
        of {BROKERAGE}. By using the Portal you agree to them. If you do not agree, please do not use the Portal.
      </p>

      <h2>1. What the Portal is for</h2>
      <p>
        The Portal lets you search MLS® listings in Toronto and the GTA, save listings and searches, receive alerts,
        plan tours and request showings. Creating an account does not by itself create a representation agreement or
        a brokerage relationship. That only happens when we both sign a written agreement.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>Give accurate information, keep your password private, and tell us if you think your account is misused.</li>
        <li>Accounts are for your personal use. We may approve, suspend or close accounts at our discretion.</li>
      </ul>

      <h2>3. Listing information</h2>
      <p>
        Listing data is provided by the Toronto Regional Real Estate Board (TRREB) and is deemed reliable but is not
        guaranteed to be accurate. It is provided for your personal, non-commercial use, to identify properties you may
        be interested in buying or leasing. You may not copy, redistribute or scrape it. Listings shown may be offered
        by other brokerages, which are named on each listing.
      </p>

      <h2>4. No professional advice</h2>
      <p>
        Market statistics, estimates and other information in the Portal are general information, not legal,
        financial, tax or appraisal advice. A comparative market analysis is not an appraisal.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        Don&apos;t attempt to access other people&apos;s information, interfere with the Portal, or use automated tools
        to collect data from it. Comments you post must be lawful and respectful; we may remove them.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        The Portal&apos;s content and design belong to {BROKERAGE}, Cory Wong or their licensors. MLS® and Multiple
        Listing Service® are trademarks of the Canadian Real Estate Association.
      </p>

      <h2>7. Links to other sites</h2>
      <p>Links to other websites are provided for convenience. We are not responsible for their content or practices.</p>

      <h2>8. Limitation of liability</h2>
      <p>
        The Portal is provided &quot;as is&quot;. To the extent permitted by law, Cory Wong and {BROKERAGE} are not
        liable for losses arising from your use of, or inability to use, the Portal or its information.
      </p>

      <h2>9. Privacy</h2>
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains how we handle your personal information.
      </p>

      <h2>10. Governing law and changes</h2>
      <p>
        These terms are governed by the laws of Ontario and the federal laws of Canada that apply there. We may update
        them; changes are posted on this page with a new date.
      </p>

      <h2>11. Contact</h2>
      <p>
        {AGENT}, {BROKERAGE}, 3640 Victoria Park Ave., Suite 300, Toronto, ON M2H 3B2, (416) 498-9995,{" "}
        <a href="mailto:cory@corywong.ca">cory@corywong.ca</a>.
      </p>
    </>
  );
}
