"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  completedById: string | null;
  completedAt: string | null;
  sortOrder: number;
}

interface FormSummary {
  id: string;
  stageId: string | null;
  title: string;
  description: string | null;
  sortOrder: number;
  hasSubmission: boolean;
}

interface FormDetail {
  id: string;
  title: string;
  description: string | null;
  schema: FormField[];
  latestSubmission: { id: string; data: Record<string, unknown> } | null;
}

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface DocItem {
  id: string;
  stageId: string | null;
  name: string;
  category: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedById: string;
  createdAt: string;
}

interface AccessLink {
  id: string;
  token: string;
  expiresAt: string;
  maxDownloads: number | null;
}

interface Stage {
  id: string;
  name: string;
  description: string | null;
  isComplete: boolean;
  displayOrder: number;
  checklistItems: ChecklistItem[];
  forms: { id: string; title: string }[];
}

interface Transaction {
  id: string;
  transactionType: string;
  status: string;
  address: string;
  mlsNumber: string | null;
  listPrice: string | null;
  salePrice: string | null;
  closingDate: string | null;
  conditionDate: string | null;
  notes: string | null;
  stages: Stage[];
  documents: DocItem[];
  clients: { id: string; role: string; user: { id: string; firstName: string; lastName: string; email: string } }[];
}

interface AuditEntry {
  id: string;
  action: string;
  userId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  documentName?: string;
  source: string;
}

interface UserInfo {
  userId: string;
  role: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(d: string) {
  return new Date(d).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-50 text-blue-700 border-blue-200",
  CONDITIONAL: "bg-amber-50 text-amber-700 border-amber-200",
  FIRM: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-300",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

const STATUSES = ["ACTIVE", "CONDITIONAL", "FIRM", "CLOSED", "CANCELLED"];
type TabKey = "checklist" | "documents" | "forms" | "audit";

// ─── Main Page ─────────────────────────────────────────────────────

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("checklist");
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadTransaction = useCallback(async () => {
    const [txnRes, userRes] = await Promise.all([
      fetch(`/api/transactions/${id}`),
      fetch("/api/auth/me"),
    ]);
    const txnData = await txnRes.json();
    const userData = await userRes.json();
    setTxn(txnData.transaction || null);
    setUser(userData.user || null);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadTransaction(); }, [loadTransaction]);

  const isAgent = user?.role === "AGENT" || user?.role === "ADMIN";

  async function updateStatus(newStatus: string) {
    if (!txn || statusUpdating) return;
    setStatusUpdating(true);
    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setTxn({ ...txn, status: newStatus });
    setStatusUpdating(false);
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-40 bg-slate-100 rounded-lg" />
        <div className="h-64 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  if (!txn) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-lg">Transaction not found</p>
        <Link href="/transactions" className="text-blue-600 hover:underline mt-2 inline-block">Back to transactions</Link>
      </div>
    );
  }

  const completedStages = txn.stages.filter((s) => s.isComplete).length;
  const totalChecklist = txn.stages.reduce((s, st) => s + st.checklistItems.length, 0);
  const completedChecklist = txn.stages.reduce((s, st) => s + st.checklistItems.filter((i) => i.completed).length, 0);

  const tabs: { key: TabKey; label: string; badge?: string }[] = [
    { key: "checklist", label: "Checklist", badge: `${completedChecklist}/${totalChecklist}` },
    { key: "documents", label: "Documents", badge: String(txn.documents.length) },
    { key: "forms", label: "Forms" },
    ...(isAgent ? [{ key: "audit" as TabKey, label: "Audit Log" }] : []),
  ];

  return (
    <div>
      <Link href="/transactions" className="text-sm text-slate-500 hover:text-slate-700 mb-4 inline-block">&larr; Back to transactions</Link>

      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {txn.transactionType}
              </span>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[txn.status] || "bg-slate-100 text-slate-600"}`}>
                {txn.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{txn.address}</h1>
            {txn.mlsNumber && <p className="text-sm text-slate-500 mt-0.5">MLS# {txn.mlsNumber}</p>}
          </div>
          {isAgent && (
            <select
              value={txn.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={statusUpdating}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* Key dates */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
          {txn.listPrice && <Stat label="List Price" value={`$${Number(txn.listPrice).toLocaleString()}`} />}
          {txn.salePrice && <Stat label="Sale Price" value={`$${Number(txn.salePrice).toLocaleString()}`} />}
          {txn.conditionDate && <Stat label="Condition Date" value={formatDate(txn.conditionDate)} />}
          {txn.closingDate && <Stat label="Closing Date" value={formatDate(txn.closingDate)} />}
        </div>
      </div>

      {/* Stage Progress */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {txn.stages.map((stage, i) => (
            <div key={stage.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                stage.isComplete
                  ? "bg-emerald-50 text-emerald-700"
                  : i === completedStages
                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300"
                  : "bg-slate-50 text-slate-400"
              }`}>
                {stage.isComplete ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <span className="w-3.5 text-center">{i + 1}</span>
                )}
                {stage.name}
              </div>
              {i < txn.stages.length - 1 && <div className={`w-6 h-px mx-1 ${stage.isComplete ? "bg-emerald-300" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="border-b border-slate-200 flex overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              {t.badge && <span className="ml-1.5 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{t.badge}</span>}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === "checklist" && <ChecklistTab txnId={id} stages={txn.stages} onUpdate={loadTransaction} />}
          {tab === "documents" && <DocumentsTab txnId={id} documents={txn.documents} stages={txn.stages} isAgent={isAgent} onUpdate={loadTransaction} />}
          {tab === "forms" && <FormsTab txnId={id} stages={txn.stages} />}
          {tab === "audit" && isAgent && <AuditLogTab txnId={id} />}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

// ─── Checklist Tab ─────────────────────────────────────────────────

function ChecklistTab({ txnId, stages, onUpdate }: { txnId: string; stages: Stage[]; onUpdate: () => void }) {
  const [toggling, setToggling] = useState<string | null>(null);

  async function toggleItem(itemId: string, completed: boolean) {
    setToggling(itemId);
    await fetch(`/api/transactions/${txnId}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, completed }),
    });
    setToggling(null);
    onUpdate();
  }

  return (
    <div className="space-y-6">
      {stages.map((stage) => {
        const done = stage.checklistItems.filter((i) => i.completed).length;
        const total = stage.checklistItems.length;
        return (
          <div key={stage.id}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-slate-900">{stage.name}</h3>
              <span className="text-xs text-slate-400">{done}/{total}</span>
            </div>
            {stage.description && <p className="text-sm text-slate-500 mb-3">{stage.description}</p>}
            <div className="space-y-1">
              {stage.checklistItems.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${toggling === item.id ? "opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleItem(item.id, !item.completed)}
                    disabled={toggling === item.id}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm flex-1 ${item.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                    {item.label}
                    {item.required && !item.completed && <span className="text-red-500 ml-1">*</span>}
                  </span>
                  {item.completedAt && (
                    <span className="text-xs text-slate-400">{formatDate(item.completedAt)}</span>
                  )}
                </label>
              ))}
            </div>
            {total > 0 && (
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Documents Tab ─────────────────────────────────────────────────

function DocumentsTab({
  txnId,
  documents,
  stages,
  isAgent,
  onUpdate,
}: {
  txnId: string;
  documents: DocItem[];
  stages: Stage[];
  isAgent: boolean;
  onUpdate: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedStage, setSelectedStage] = useState("");
  const [category, setCategory] = useState("general");
  const [linkModal, setLinkModal] = useState<string | null>(null);
  const [linkResult, setLinkResult] = useState<AccessLink | null>(null);
  const [linkHours, setLinkHours] = useState(24);
  const [linkMaxDl, setLinkMaxDl] = useState<number | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      if (selectedStage) form.append("stageId", selectedStage);
      await fetch(`/api/transactions/${txnId}/documents`, { method: "POST", body: form });
    }
    setUploading(false);
    onUpdate();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }

  async function createAccessLink(docId: string) {
    const res = await fetch(`/api/transactions/${txnId}/documents/${docId}/access-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresInHours: linkHours, maxDownloads: linkMaxDl || null }),
    });
    const data = await res.json();
    setLinkResult(data.link);
  }

  const stageMap = Object.fromEntries(stages.map((s) => [s.id, s.name]));

  return (
    <div>
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-6 ${
          dragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
        <p className="text-sm text-slate-600 mb-3">
          {uploading ? "Uploading..." : "Drag files here or click to upload"}
        </p>
        <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
          <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1">
            <option value="">No stage</option>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1">
            {["general", "offer", "agreement", "condition", "amendment", "inspection", "financial", "legal", "closing"].map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <input ref={fileInputRef} type="file" multiple onChange={(e) => handleUpload(e.target.files)} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Select Files
        </button>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No documents uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{doc.name}</div>
                  <div className="text-xs text-slate-400">
                    {doc.fileSize ? formatBytes(doc.fileSize) : ""}
                    {doc.stageId ? ` · ${stageMap[doc.stageId] || ""}` : ""}
                    {` · ${doc.category}`}
                    {` · ${formatDate(doc.createdAt)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`/api/transactions/${txnId}/documents/${doc.id}`}
                  className="text-xs px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  Download
                </a>
                {isAgent && (
                  <button
                    onClick={() => { setLinkModal(doc.id); setLinkResult(null); }}
                    className="text-xs px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Share Link
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Access link modal */}
      {linkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setLinkModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900 mb-4">Create Secure Access Link</h3>
            {linkResult ? (
              <div>
                <p className="text-sm text-slate-600 mb-2">Share this link — it will expire automatically:</p>
                <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono break-all text-slate-700 mb-2">
                  {window.location.origin}/api/documents/access/{linkResult.token}
                </div>
                <p className="text-xs text-slate-400 mb-4">Expires: {formatTime(linkResult.expiresAt)}{linkResult.maxDownloads ? ` · Max downloads: ${linkResult.maxDownloads}` : ""}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/documents/access/${linkResult.token}`);
                  }}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Copy Link
                </button>
              </div>
            ) : (
              <div>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Expires in (hours)</label>
                    <input type="number" value={linkHours} onChange={(e) => setLinkHours(Number(e.target.value))} min={1} max={720} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Max downloads (optional)</label>
                    <input type="number" value={linkMaxDl || ""} onChange={(e) => setLinkMaxDl(e.target.value ? Number(e.target.value) : undefined)} min={1} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Unlimited" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setLinkModal(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button onClick={() => createAccessLink(linkModal)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Create Link</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Forms Tab ─────────────────────────────────────────────────────

function FormsTab({ txnId, stages }: { txnId: string; stages: Stage[] }) {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<FormDetail | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/transactions/${txnId}/forms`)
      .then((r) => r.json())
      .then((d) => setForms(d.forms || []))
      .finally(() => setLoading(false));
  }, [txnId]);

  async function openForm(formId: string) {
    const res = await fetch(`/api/transactions/${txnId}/forms/${formId}`);
    const data = await res.json();
    setActiveForm(data.form);
    setFormData(data.form?.latestSubmission?.data || {});
    setSaved(false);
  }

  async function submitForm() {
    if (!activeForm) return;
    setSaving(true);
    await fetch(`/api/transactions/${txnId}/forms/${activeForm.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: formData }),
    });
    setSaving(false);
    setSaved(true);
    // Refresh forms list
    const res = await fetch(`/api/transactions/${txnId}/forms`);
    const d = await res.json();
    setForms(d.forms || []);
  }

  const stageMap = Object.fromEntries(stages.map((s) => [s.id, s.name]));

  if (loading) return <p className="text-slate-500 text-sm">Loading forms...</p>;

  if (activeForm) {
    return (
      <div>
        <button onClick={() => setActiveForm(null)} className="text-sm text-slate-500 hover:text-slate-700 mb-4">&larr; Back to forms</button>
        <h3 className="font-semibold text-lg text-slate-900 mb-1">{activeForm.title}</h3>
        {activeForm.description && <p className="text-sm text-slate-500 mb-4">{activeForm.description}</p>}
        <div className="space-y-4">
          {(activeForm.schema as FormField[]).map((field) => (
            <FormFieldInput key={field.name} field={field} value={formData[field.name]} onChange={(v) => setFormData({ ...formData, [field.name]: v })} />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-6">
          <button onClick={submitForm} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Form"}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved successfully</span>}
        </div>
      </div>
    );
  }

  if (forms.length === 0) return <p className="text-slate-500 text-sm text-center py-4">No forms for this transaction type</p>;

  // Group by stage
  const grouped: Record<string, FormSummary[]> = {};
  for (const f of forms) {
    const key = f.stageId || "none";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([stageId, stageForms]) => (
        <div key={stageId}>
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">
            {stageId === "none" ? "General" : stageMap[stageId] || "Unknown Stage"}
          </h3>
          <div className="space-y-2">
            {stageForms.map((f) => (
              <button
                key={f.id}
                onClick={() => openForm(f.id)}
                className="w-full text-left p-3 rounded-lg border border-slate-100 hover:bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{f.title}</div>
                  {f.description && <div className="text-xs text-slate-400 mt-0.5">{f.description}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${f.hasSubmission ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {f.hasSubmission ? "Submitted" : "Not started"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FormFieldInput({ field, value, onChange }: { field: FormField; value: unknown; onChange: (v: unknown) => void }) {
  const base = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={3} className={base} />
      ) : field.type === "select" ? (
        <select value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">Select...</option>
          {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : field.type === "checkbox" ? (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm text-slate-600">Yes</span>
        </label>
      ) : field.type === "currency" ? (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <input type="number" value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || "0.00"} step="0.01" className={`${base} pl-7`} />
        </div>
      ) : (
        <input
          type={field.type === "phone" ? "tel" : field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={base}
        />
      )}
    </div>
  );
}

// ─── Audit Log Tab ─────────────────────────────────────────────────

function AuditLogTab({ txnId }: { txnId: string }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetch(`/api/transactions/${txnId}/audit?limit=50&offset=${offset}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.auditLogs || []);
        setTotal(d.total || 0);
      })
      .finally(() => setLoading(false));
  }, [txnId, offset]);

  const actionColors: Record<string, string> = {
    TRANSACTION_CREATED: "text-blue-600 bg-blue-50",
    TRANSACTION_UPDATED: "text-slate-600 bg-slate-50",
    DOCUMENT_UPLOADED: "text-emerald-600 bg-emerald-50",
    DOCUMENT_DOWNLOADED: "text-indigo-600 bg-indigo-50",
    DOCUMENT_DELETED: "text-red-600 bg-red-50",
    ACCESS_LINK_CREATED: "text-amber-600 bg-amber-50",
    ACCESS_LINK_REVOKED: "text-orange-600 bg-orange-50",
    ACCESS_LINK_USED: "text-purple-600 bg-purple-50",
    CHECKLIST_UPDATED: "text-teal-600 bg-teal-50",
    FORM_SUBMITTED: "text-cyan-600 bg-cyan-50",
    PARTICIPANT_ADDED: "text-green-600 bg-green-50",
    PARTICIPANT_REMOVED: "text-red-600 bg-red-50",
  };

  if (loading) return <p className="text-slate-500 text-sm">Loading audit log...</p>;

  if (logs.length === 0) return <p className="text-slate-500 text-sm text-center py-4">No audit entries yet</p>;

  return (
    <div>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50">
            <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${actionColors[log.action] || "text-slate-600 bg-slate-50"}`}>
              {log.action.replace(/_/g, " ")}
            </span>
            <div className="flex-1 min-w-0">
              {log.documentName && <span className="text-xs text-slate-500">Document: {log.documentName} · </span>}
              {log.details && (
                <span className="text-xs text-slate-500">
                  {Object.entries(log.details as Record<string, unknown>)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">{formatTime(log.createdAt)}</span>
          </div>
        ))}
      </div>
      {total > 50 && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))} className="text-sm px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Previous</button>
          <span className="text-xs text-slate-400">{offset + 1}-{Math.min(offset + 50, total)} of {total}</span>
          <button disabled={offset + 50 >= total} onClick={() => setOffset(offset + 50)} className="text-sm px-3 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Next</button>
        </div>
      )}
    </div>
  );
}
