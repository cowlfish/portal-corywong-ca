"use client";

import { useEffect, useState } from "react";

interface Flags {
  messagingEnabled: boolean;
  transactionsEnabled: boolean;
}

const FLAG_META: Record<keyof Flags, { label: string; description: string }> = {
  messagingEnabled: {
    label: "Messaging",
    description: "Enable direct messaging between you and your clients within the portal",
  },
  transactionsEnabled: {
    label: "Transaction Management",
    description: "Enable transaction tracking, document management, and stage workflows",
  },
};

export default function AgentSettingsPage() {
  const [flags, setFlags] = useState<Flags | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agent/feature-flags")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setFlags)
      .catch(() => setError("Unable to load feature flags"))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(key: keyof Flags) {
    if (!flags) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: !flags[key] }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setFlags(updated);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage portal feature flags</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-400">Loading settings...</div>
      ) : flags ? (
        <div className="space-y-4">
          {(Object.keys(FLAG_META) as (keyof Flags)[]).map((key) => {
            const { label, description } = FLAG_META[key];
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
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                    flags[key] ? "bg-indigo-600" : "bg-slate-300"
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
      ) : null}
    </div>
  );
}
