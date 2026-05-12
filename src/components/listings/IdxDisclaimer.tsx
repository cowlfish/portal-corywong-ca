export default function IdxDisclaimer({ className }: { className?: string }) {
  return (
    <div className={`text-xs text-slate-500 border-t border-slate-200 pt-4 ${className || ""}`}>
      <p className="font-semibold mb-1">
        IDX information is provided exclusively for consumers&apos; personal,
        non-commercial use and may not be used for any purpose other than to
        identify prospective properties consumers may be interested in
        purchasing.
      </p>
      <p className="mt-1">
        The data relating to real estate on this website comes in part from the
        MLS&reg; Reciprocity program of the Toronto Regional Real Estate Board
        (TRREB). All listing data, including but not limited to: prices,
        descriptions, conditions, and property features, is compiled from TRREB
        sources and is deemed reliable but not guaranteed. The listing
        broker&apos;s offer of compensation is made only to other TRREB members.
      </p>
      <p className="mt-1">
        Last updated: {new Date().toLocaleDateString("en-CA")}. Listing
        information is provided under copyright&nbsp;&copy; {new Date().getFullYear()}{" "}
        Toronto Regional Real Estate Board. All rights reserved.
      </p>
    </div>
  );
}
