"use client";

import { useEffect, useState } from "react";

interface PendingUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export default function AgentApprovalsPage() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  function fetchPending() {
    setLoading(true);
    fetch("/api/agent/approvals")
      .then((r) => r.json())
      .then((d) => setPending(d.pending ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function handleAction(userId: string, action: "approve" | "reject") {
    setActing(userId);
    try {
      const res = await fetch("/api/agent/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch {
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
        <p className="text-slate-500 mt-1">Review and approve new client signups</p>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading approvals...</div>
      ) : pending.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-slate-400 text-lg">No pending approvals</div>
          <p className="text-slate-400 text-sm mt-1">New signup requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg border border-slate-200 p-5 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-slate-900">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-sm text-slate-500">{user.email}</div>
                {user.phone && <div className="text-sm text-slate-500">{user.phone}</div>}
                <div className="text-xs text-slate-400 mt-1">
                  Registered {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(user.id, "approve")}
                  disabled={acting === user.id}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(user.id, "reject")}
                  disabled={acting === user.id}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
