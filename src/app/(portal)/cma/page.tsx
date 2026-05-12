"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CmaReport {
  id: string;
  name: string;
  status: string;
  subjectAddress: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { comps: number; soldComps: number };
}

export default function CmaListPage() {
  const router = useRouter();
  const [reports, setReports] = useState<CmaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/cma")
      .then((r) => r.json())
      .then((d) => setReports(d.reports || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/cma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.report) {
        router.push(`/cma/${data.report.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this CMA report?")) return;
    await fetch(`/api/cma/${id}`, { method: "DELETE" });
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-500">Loading CMA reports...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CMA Reports</h1>
          <p className="text-slate-500 mt-1">Comparative Market Analysis builder</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          New CMA
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 bg-white border border-slate-200 rounded-lg p-4 flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Report name (e.g. 123 Main St CMA)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewName(""); }}
            className="px-4 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
        </form>
      )}

      {reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No CMA reports yet</h3>
          <p className="text-slate-500 text-sm mb-4">Create your first Comparative Market Analysis to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            Create CMA
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <Link href={`/cma/${report.id}`} className="flex-1">
                  <h3 className="font-semibold text-slate-900 hover:text-slate-700">{report.name}</h3>
                  {report.subjectAddress && (
                    <p className="text-sm text-slate-500 mt-0.5">{report.subjectAddress}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span>{report._count.comps} active comp{report._count.comps !== 1 ? "s" : ""}</span>
                    <span>{report._count.soldComps} sold comp{report._count.soldComps !== 1 ? "s" : ""}</span>
                    <span>Updated {new Date(report.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-2 ml-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    report.status === "FINALIZED"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}>
                    {report.status === "FINALIZED" ? "Finalized" : "Draft"}
                  </span>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
