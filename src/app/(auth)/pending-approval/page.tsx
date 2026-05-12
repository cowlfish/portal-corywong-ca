"use client";

import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const router = useRouter();

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

      <h2 className="text-xl font-semibold text-slate-900 mb-2">Account Pending Approval</h2>
      <p className="text-slate-600 mb-6">
        Your account has been created and is waiting for agent approval.
        You&apos;ll be able to access the portal once your account is approved.
      </p>

      <div className="bg-slate-50 rounded-md p-4 mb-6">
        <p className="text-sm text-slate-500">
          If you believe this is an error or need immediate access,
          please contact your real estate agent directly.
        </p>
      </div>

      <button
        onClick={handleLogout}
        className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
