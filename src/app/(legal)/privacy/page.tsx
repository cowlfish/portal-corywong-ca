import type { Metadata } from "next";
import { AGENT, BROKERAGE } from "@/lib/reco";

export const metadata: Metadata = {
  title: "Privacy Policy | Cory Wong, Broker, Trustwell Realty Inc., Brokerage",
};

// Reviewed against what the portal actually stores (prisma/schema.prisma). Update this page,
// and LAST_UPDATED, whenever the portal starts collecting something new.
const LAST_UPDATED = "October 20, 2026";

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

      <p>
        This policy explains how {AGENT}, and {BROKERAGE} (&quot;we&quot;, &quot;us&quot;), collect, use and
        protect personal information through the client portal at portal.corywong.ca (the &quot;Portal&quot;).
        We handle personal information in accordance with Canada&apos;s Personal Information Protection and
        Electronic Documents Act (PIPEDA) and the Trust in Real Estate Services Act, 2002 (TRESA).
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account details</strong> you give us when you register: your name, email address, phone number
          (optional) and password. We store only a one-way hash of your password, never the password itself.
        </li>
        <li>
          <strong>Your activity in the Portal</strong>: saved searches and alert settings, saved listings, tours you
          plan, comments you leave on listings, and when you last signed in.
        </li>
        <li>
          <strong>Tour and showing requests</strong>: the property, your preferred times, your contact details and any
          message you include.
        </li>
        <li>
          <strong>Transaction documents</strong>, if we work on a transaction together and share documents through the
          Portal. These are encrypted before they are stored.
        </li>
        <li>
          <strong>Technical information</strong> needed to run the Portal securely, such as your IP address and browser
          type in server logs, and records of sign-ins and document access.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To create and manage your account, and to decide whether to approve it.</li>
        <li>To respond to your requests, arrange showings and provide real estate services to you.</li>
        <li>To show you listings, saved searches and alerts that match what you&apos;re looking for.</li>
        <li>To keep the Portal secure and to meet our record-keeping obligations under TRESA.</li>
      </ul>
      <p>
        We do not sell or rent your personal information, and we do not use it to send you marketing email. If we
        ever offer a newsletter, we will ask for your separate, express consent first.
      </p>

      <h2>3. Who we share it with</h2>
      <p>
        Your information is available to {AGENT}, and to {BROKERAGE} as the brokerage responsible for this Portal.
        We share it with others only as needed to provide services you ask for (for example, a listing brokerage
        when booking a showing), when the law requires it, or with your consent.
      </p>
      <p>We use these service providers to run the Portal:</p>
      <ul>
        <li>Cloudflare (hosting, file storage and sending notification emails)</li>
        <li>Neon (database hosting)</li>
      </ul>
      <p>
        These providers may store or process information outside Canada, including in the United States, where it
        may be accessible to authorities under local law. They are permitted to use it only to provide their services
        to us.
      </p>

      <h2>4. Cookies</h2>
      <p>
        The Portal uses one essential cookie, <code>portal_session</code>, to keep you signed in. It expires after 7
        days or when you sign out. Saved listings for visitors who are not signed in are kept in your browser&apos;s
        local storage and never sent to us. The Portal does not use analytics or advertising cookies.
      </p>

      <h2>5. Listing information</h2>
      <p>
        Listing data is provided by the Toronto Regional Real Estate Board (TRREB) and is displayed under TRREB&apos;s
        terms. It is not personal information we collect from you.
      </p>

      <h2>6. Retention and security</h2>
      <p>
        We keep account information while your account is open, and transaction records for as long as TRESA and the
        brokerage&apos;s record-keeping obligations require. Access to the Portal is limited by account role, data is
        sent over encrypted connections, and transaction documents are encrypted at rest.
      </p>

      <h2>7. Your choices and rights</h2>
      <p>Under PIPEDA you may:</p>
      <ul>
        <li>ask what personal information we hold about you, and for a copy of it;</li>
        <li>ask us to correct information that is inaccurate;</li>
        <li>withdraw your consent, for example by asking us to close your account, subject to legal requirements;</li>
        <li>
          complain to the{" "}
          <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">
            Office of the Privacy Commissioner of Canada
          </a>{" "}
          (opens in a new tab).
        </li>
      </ul>

      <h2>8. Children</h2>
      <p>The Portal is not intended for anyone under 18, and we do not knowingly collect their information.</p>

      <h2>9. Changes</h2>
      <p>We will post any changes on this page and update the date above.</p>

      <h2>10. Contact</h2>
      <p>
        For privacy questions or requests, contact {AGENT}, at{" "}
        <a href="mailto:cory@corywong.ca">cory@corywong.ca</a>, or {BROKERAGE}, 3640 Victoria Park Ave., Suite 300,
        Toronto, ON M2H 3B2, (416) 498-9995.
      </p>
    </>
  );
}
