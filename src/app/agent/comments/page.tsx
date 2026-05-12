"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Listing {
  id: string;
  mlsNumber: string;
  streetNumber: string | null;
  streetName: string | null;
  city: string | null;
  listPrice: string | number;
}

interface Comment {
  id: string;
  body: string;
  visibility: string;
  createdAt: string;
  author: Author;
  listing: Listing;
}

interface Group {
  id: string;
  name: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

const VIS_LABELS: Record<string, string> = {
  PRIVATE: "Private",
  GROUP: "Group",
  AGENT: "Agent",
  PUBLIC: "Public",
  SPECIFIC_CLIENTS: "Specific Clients",
  CLIENT_GROUP: "Client Group",
};

const VIS_COLORS: Record<string, string> = {
  PRIVATE: "bg-slate-100 text-slate-600",
  GROUP: "bg-violet-100 text-violet-700",
  AGENT: "bg-amber-100 text-amber-700",
  PUBLIC: "bg-green-100 text-green-700",
  SPECIFIC_CLIENTS: "bg-blue-100 text-blue-700",
  CLIENT_GROUP: "bg-violet-100 text-violet-700",
};

function formatAddress(l: Listing): string {
  return [l.streetNumber, l.streetName].filter(Boolean).join(" ") || l.mlsNumber;
}

export default function AgentCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filterClient, setFilterClient] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterListing, setFilterListing] = useState("");

  useEffect(() => {
    fetch("/api/agent/clients?status=APPROVED")
      .then((r) => r.json())
      .then((d) => setClients(d.clients || []))
      .catch(() => {});
    fetch("/api/agent/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups || []))
      .catch(() => {});
  }, []);

  const loadComments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterClient) params.set("clientId", filterClient);
    if (filterGroup) params.set("groupId", filterGroup);
    if (filterListing) params.set("listingId", filterListing);

    fetch(`/api/agent/comments?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterClient, filterGroup, filterListing]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const uniqueListings = Array.from(
    new Map(comments.map((c) => [c.listing.id, c.listing])).values()
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">All Comments</h1>
        <p className="text-slate-500 mt-1">View and filter comments across all listings</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>

        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="text-sm border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        {uniqueListings.length > 0 && (
          <select
            value={filterListing}
            onChange={(e) => setFilterListing(e.target.value)}
            className="text-sm border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All listings</option>
            {uniqueListings.map((l) => (
              <option key={l.id} value={l.id}>
                {formatAddress(l)} — {l.city || ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-slate-400">No comments found.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-slate-900">
                  {c.author.firstName} {c.author.lastName}
                </span>
                {c.author.role === "AGENT" && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">
                    Agent
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${VIS_COLORS[c.visibility] || ""}`}>
                  {VIS_LABELS[c.visibility] || c.visibility}
                </span>
                <span className="text-xs text-slate-400 ml-auto">
                  {new Date(c.createdAt).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p className="text-sm text-slate-700 whitespace-pre-line mb-2">{c.body}</p>

              <div className="text-xs text-slate-400">
                <Link
                  href={`/listings/${c.listing.id}`}
                  className="hover:text-indigo-600 transition-colors"
                >
                  {formatAddress(c.listing)}, {c.listing.city} — MLS® {c.listing.mlsNumber}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
