"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Flags {
  messagingEnabled: boolean;
  transactionsEnabled: boolean;
  ampreFeedLive: boolean;
}

const FLAG_LABELS: Record<keyof Flags, { label: string; description: string }> = {
  messagingEnabled: {
    label: "Messaging",
    description: "Direct messaging between agent and clients (currently disabled — agent uses WhatsApp/text/call)",
  },
  transactionsEnabled: {
    label: "Transaction Management",
    description: "Transaction tracking, document management, and stage workflows (pending security review)",
  },
  ampreFeedLive: {
    label: "AMPRE Feed Live",
    description: "When enabled, the property search page shows live MLS data instead of the data-pending placeholder",
  },
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [flags, setFlags] = useState<Flags | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAgent, setIsAgent] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || (d.user.role !== "AGENT" && d.user.role !== "ADMIN")) {
          setIsAgent(false);
          router.push("/dashboard");
          return;
        }
      })
      .catch(() => router.push("/dashboard"));

    fetch("/api/admin/feature-flags")
      .then((r) => {
        if (!r.ok) throw new Error("forbidden");
        return r.json();
      })
      .then(setFlags)
      .catch(() => setError("Unable to load feature flags"));
  }, [router]);

  async function handleToggle(key: keyof Flags) {
    if (!flags) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: !flags[key] }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setFlags(updated);
    } catch {
      setError("Failed to save. Make sure the database migration has been applied.");
    } finally {
      setSaving(false);
    }
  }

  if (!isAgent) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Feature Settings</h1>
        <p className="text-slate-500 mt-1">
          Toggle portal features on or off. Changes take effect immediately.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {!flags ? (
        <div className="text-slate-400">Loading settings...</div>
      ) : (
        <div className="space-y-4">
          {(Object.keys(FLAG_LABELS) as (keyof Flags)[]).map((key) => {
            const { label, description } = FLAG_LABELS[key];
            return (
              <div
                key={key}
                className="bg-white rounded-lg border border-slate-200 p-5 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="font-semibold text-slate-900">{label}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{description}</div>
                </div>
                <button
                  onClick={() => handleToggle(key)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 ${
                    flags[key] ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={flags[key]}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      flags[key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
