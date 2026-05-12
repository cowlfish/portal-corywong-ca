"use client";

import { useCallback, useEffect, useState } from "react";

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Comment {
  id: string;
  body: string;
  visibility: string;
  visibleToUsers: string[];
  visibleToGroups: string[];
  createdAt: string;
  author: Author;
}

interface Group {
  id: string;
  name: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const VISIBILITY_LABELS: Record<string, string> = {
  PRIVATE: "Private (only you)",
  GROUP: "Group (your groups + agent)",
  AGENT: "Agent only",
  PUBLIC: "All approved clients",
  SPECIFIC_CLIENTS: "Specific clients",
  CLIENT_GROUP: "Client group",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const colors: Record<string, string> = {
    PRIVATE: "bg-slate-100 text-slate-600",
    GROUP: "bg-violet-100 text-violet-700",
    AGENT: "bg-amber-100 text-amber-700",
    PUBLIC: "bg-green-100 text-green-700",
    SPECIFIC_CLIENTS: "bg-blue-100 text-blue-700",
    CLIENT_GROUP: "bg-violet-100 text-violet-700",
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[visibility] || "bg-slate-100 text-slate-600"}`}>
      {VISIBILITY_LABELS[visibility] || visibility}
    </span>
  );
}

export default function CommentThread({ listingId }: { listingId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [userGroupCount, setUserGroupCount] = useState(0);

  const loadComments = useCallback(() => {
    fetch(`/api/listings/${listingId}/comments`)
      .then((r) => {
        if (r.status === 401) {
          setUserRole(null);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setComments(data.comments || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [listingId]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUserRole(data.user.role);
          const defaultVis = data.user.role === "AGENT" || data.user.role === "ADMIN" ? "PUBLIC" : "PRIVATE";
          setVisibility(defaultVis);

          if (data.user.role === "AGENT" || data.user.role === "ADMIN") {
            fetch("/api/agent/groups")
              .then((r) => r.json())
              .then((d) => setGroups(d.groups || []))
              .catch(() => {});
            fetch("/api/agent/clients?status=APPROVED")
              .then((r) => r.json())
              .then((d) => setClients(d.clients || []))
              .catch(() => {});
          } else {
            fetch("/api/auth/me")
              .then((r) => r.json())
              .then((d) => {
                if (d.user?.groupCount != null) setUserGroupCount(d.user.groupCount);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});

    loadComments();
  }, [loadComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        body: body.trim(),
        visibility,
      };
      if (visibility === "SPECIFIC_CLIENTS") {
        payload.visibleToUsers = selectedClients;
      }
      if (visibility === "CLIENT_GROUP") {
        payload.visibleToGroups = [selectedGroup];
      }

      const res = await fetch(`/api/listings/${listingId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setBody("");
        setSelectedClients([]);
        setSelectedGroup("");
        loadComments();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (userRole === null && !loading) {
    return null;
  }

  const isAgent = userRole === "AGENT" || userRole === "ADMIN";

  const clientVisOptions = [
    { value: "PRIVATE", label: "Private (only me)" },
    { value: "AGENT", label: "Agent only" },
    ...(userGroupCount > 0
      ? [{ value: "GROUP", label: "My group + agent" }]
      : []),
  ];

  const agentVisOptions = [
    { value: "PUBLIC", label: "All approved clients" },
    { value: "SPECIFIC_CLIENTS", label: "Specific clients" },
    { value: "CLIENT_GROUP", label: "Client group" },
  ];

  const visOptions = isAgent ? agentVisOptions : clientVisOptions;

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Comments</h2>

      {loading ? (
        <p className="text-sm text-slate-400">Loading comments...</p>
      ) : (
        <>
          {comments.length === 0 && (
            <p className="text-sm text-slate-400 mb-4">No comments yet. Be the first to add one.</p>
          )}

          <div className="space-y-3 mb-6">
            {comments.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-slate-900">
                    {c.author.firstName} {c.author.lastName}
                  </span>
                  {c.author.role === "AGENT" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">
                      Agent
                    </span>
                  )}
                  <VisibilityBadge visibility={c.visibility} />
                  <span className="text-xs text-slate-400 ml-auto">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-line">{c.body}</p>
              </div>
            ))}
          </div>

          {userRole && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-slate-500 font-medium">Visibility:</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="text-sm border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {visOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {isAgent && visibility === "SPECIFIC_CLIENTS" && (
                  <select
                    multiple
                    value={selectedClients}
                    onChange={(e) =>
                      setSelectedClients(
                        Array.from(e.target.selectedOptions, (o) => o.value)
                      )
                    }
                    className="text-sm border border-slate-300 rounded-md px-2 py-1.5 min-w-[180px] max-h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {clients.map((cl) => (
                      <option key={cl.id} value={cl.id}>
                        {cl.firstName} {cl.lastName}
                      </option>
                    ))}
                  </select>
                )}

                {isAgent && visibility === "CLIENT_GROUP" && (
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="text-sm border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select group...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}

                <button
                  type="submit"
                  disabled={submitting || !body.trim()}
                  className="ml-auto px-4 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
