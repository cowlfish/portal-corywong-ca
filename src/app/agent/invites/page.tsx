"use client";

import { useEffect, useState } from "react";

interface Invite {
  id: string;
  token: string;
  email: string | null;
  status: "ACTIVE" | "EXPIRED" | "USED";
  createdAt: string;
  expiresAt: string;
}

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRED: "bg-slate-100 text-slate-500",
  USED: "bg-blue-100 text-blue-700",
};

export default function AgentInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites();
  }, []);

  function fetchInvites() {
    setLoading(true);
    fetch("/api/agent/invites")
      .then((r) => r.json())
      .then((d) => setInvites(d.invites ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/agent/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || undefined }),
      });
      if (res.ok) {
        setEmail("");
        setShowCreate(false);
        fetchInvites();
      }
    } catch {
    } finally {
      setCreating(false);
    }
  }

  function getInviteUrl(token: string) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/register-invite/${token}`;
    }
    return `/register-invite/${token}`;
  }

  async function handleCopy(token: string) {
    const url = getInviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invite Links</h1>
          <p className="text-slate-500 mt-1">Create and manage client invite links</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          {showCreate ? "Cancel" : "New Invite"}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="client@example.com"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating..." : "Create Invite"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400">Loading invites...</div>
      ) : invites.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-slate-400 text-lg">No invites yet</div>
          <p className="text-slate-400 text-sm mt-1">Create an invite link to onboard clients</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="bg-white rounded-lg border border-slate-200 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[invite.status]}`}>
                      {invite.status}
                    </span>
                    {invite.email && (
                      <span className="text-sm text-slate-500">{invite.email}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono truncate">
                    {getInviteUrl(invite.token)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Created {new Date(invite.createdAt).toLocaleDateString()}
                    {" / "}
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(invite.token)}
                  className="ml-4 px-3 py-1.5 rounded-md text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
                >
                  {copied === invite.token ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
