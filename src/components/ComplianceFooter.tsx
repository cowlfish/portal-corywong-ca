export default function ComplianceFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`bg-slate-900 text-slate-400 text-xs leading-relaxed ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-3">
        <div>
          <span className="text-slate-300 font-medium">Cory Wong</span>,
          Salesperson | Registration #00000000
        </div>
        <div>
          Trustwell Realty Inc., Brokerage | 123 Main Street, Suite 100,
          Toronto, ON M5V 1A1 | (416) 555-0100
        </div>
        <div className="border-t border-slate-700 pt-3">
          This brokerage and its salespersons are registered with the Real
          Estate Council of Ontario (RECO). RECO ensures the protection of
          consumers and the integrity of Ontario&apos;s real estate industry.
          For more information, visit{" "}
          <a
            href="https://www.reco.on.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-300 underline hover:text-white"
          >
            www.reco.on.ca
          </a>
          .
        </div>
        <div className="border-t border-slate-700 pt-3">
          MLS&reg;, Multiple Listing Service&reg;, and the associated logos are
          owned by The Canadian Real Estate Association (CREA) and identify the
          quality of services provided by real estate professionals who are
          members of CREA. REALTOR&reg; is a trademark owned by CREA and used to
          identify real estate professionals who are members of CREA.
        </div>
        <div className="text-slate-500">
          The listing data is provided under copyright by the Toronto Regional
          Real Estate Board (TRREB). The information is deemed reliable but is
          not guaranteed.
        </div>
        <div className="border-t border-slate-700 pt-3 text-slate-500">
          &copy; {new Date().getFullYear()} Cory Wong Real Estate. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}
