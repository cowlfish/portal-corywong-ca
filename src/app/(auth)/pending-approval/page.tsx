"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [stillPending, setStillPending] = useState(false);

  // /api/auth/me refreshes the session once Cory approves, so this moves the client on
  const fetchStatus = useCallback(
    () =>
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.user?.approvalStatus === "APPROVED") router.push("/dashboard");
          else setStillPending(true);
        })
        .catch(() => setStillPending(true)),
    [router]
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function checkStatus() {
    setChecking(true);
    setStillPending(false);
    await fetchStatus();
    setChecking(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
        <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-slate-900 mb-2">Thanks for signing up</h2>
      <p className="text-slate-600 mb-6">
        Cory has been notified and will review your account personally. Once it&apos;s approved you&apos;ll have
        saved searches, lists and tour planning.
      </p>

      <div className="bg-slate-50 rounded-md p-4 mb-6 text-left">
        <p className="text-sm font-medium text-slate-900">In the meantime</p>
        <ul className="mt-2 text-sm text-slate-600 space-y-1 list-disc pl-5">
          <li>
            <Link href="/listings" className="text-slate-900 underline">
              Search listings
            </Link>{" "}
            and request a showing from any listing page.
          </li>
          <li>
            Reach Cory directly:{" "}
            <a href="tel:+1-416-498-9995" className="text-slate-900 underline">
              (416) 498-9995
            </a>{" "}
            or{" "}
            <a href="mailto:cory.wong@trustwell.ca" className="text-slate-900 underline">
              cory.wong@trustwell.ca
            </a>
            .
          </li>
        </ul>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={checkStatus}
          disabled={checking}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {checking ? "Checking..." : "Check again"}
        </button>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
        >
          Sign Out
        </button>
      </div>
      {stillPending && !checking && (
        <p className="mt-3 text-xs text-slate-400">Still waiting for approval.</p>
      )}
    </div>
  );
}
