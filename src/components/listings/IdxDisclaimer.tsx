export default function IdxDisclaimer({ className, variant = "full" }: { className?: string; variant?: "full" | "short" }) {
  if (variant === "short") {
    return (
      <p className={`text-xs text-slate-500 ${className || ""}`}>
        Listing data TRREB via MLS&reg; Reciprocity. Data deemed reliable but
        not guaranteed.
      </p>
    );
  }

  return (
    <div className={`text-xs text-slate-500 border-t border-slate-200 pt-4 ${className || ""}`}>
      <p className="font-semibold mb-1">
        MLS&reg;, Multiple Listing Service&reg;, and the associated logos are
        trademarks of The Canadian Real Estate Association (CREA) and identify
        the quality of services provided by real estate professionals who are
        members of CREA. REALTOR&reg;, REALTORS&reg;, and the REALTOR&reg; logo
        are trademarks of CREA, used under license by members of CREA to
        identify real estate professionals who are members of CREA.
      </p>
      <p className="mt-2">
        Listing data is provided under the MLS&reg; Reciprocity program of the
        Toronto Regional Real Estate Board (TRREB). Data is deemed reliable but
        not guaranteed. IDX information is provided for consumers&apos; personal,
        non-commercial use only and may not be used for any purpose other than to
        identify properties consumers may be interested in purchasing. Listing
        data is copyright&nbsp;&copy; TRREB. All rights reserved.
      </p>
      <p className="mt-1">
        Last updated: {new Date().toLocaleDateString("en-CA")}
      </p>
    </div>
  );
}
