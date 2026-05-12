"use client";

import { useEffect, useState } from "react";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  members: Client[];
}

export default function AgentGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [approvedClients, setApprovedClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
    fetch("/api/agent/clients?status=approved")
      .then((r) => r.json())
      .then((d) => setApprovedClients(d.clients ?? []))
      .catch(() => {});
  }, []);

  function fetchGroups() {
    setLoading(true);
    fetch("/api/agent/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/agent/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, memberIds: selectedClients }),
      });
      if (res.ok) {
        setNewName("");
        setSelectedClients([]);
        setShowCreate(false);
        fetchGroups();
      }
    } catch {
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(groupId: string) {
    if (!confirm("Delete this group?")) return;
    setDeleting(groupId);
    try {
      const res = await fetch(`/api/agent/groups/${groupId}`, { method: "DELETE" });
      if (res.ok) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (expandedId === groupId) setExpandedId(null);
      }
    } catch {
    } finally {
      setDeleting(null);
    }
  }

  async function handleAddMember(groupId: string, clientId: string) {
    try {
      const res = await fetch(`/api/agent/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (res.ok) fetchGroups();
    } catch {}
  }

  async function handleRemoveMember(groupId: string, clientId: string) {
    try {
      const res = await fetch(`/api/agent/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (res.ok) fetchGroups();
    } catch {}
  }

  function toggleClient(clientId: string) {
    setSelectedClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  }

  function getInitials(first: string, last: string) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client Groups</h1>
          <p className="text-slate-500 mt-1">Organize clients into groups</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          {showCreate ? "Cancel" : "New Group"}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter group name"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Clients</label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
              {approvedClients.length === 0 ? (
                <div className="p-3 text-sm text-slate-400">No approved clients</div>
              ) : (
                approvedClients.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(c.id)}
                      onChange={() => toggleClient(c.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{c.firstName} {c.lastName}</span>
                    <span className="text-xs text-slate-400">{c.email}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-slate-400 text-lg">No groups yet</div>
          <p className="text-slate-400 text-sm mt-1">Create a group to organize your clients</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = expandedId === group.id;
            const memberIds = group.members.map((m) => m.id);
            const nonMembers = approvedClients.filter((c) => !memberIds.includes(c.id));

            return (
              <div key={group.id} className="bg-white rounded-lg border border-slate-200">
                <div className="p-5 flex items-center justify-between">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : group.id)}
                    className="flex items-center gap-3 text-left flex-1"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{group.name}</div>
                      <div className="text-sm text-slate-500">{group.members.length} members</div>
                    </div>
                    <div className="flex -space-x-2 ml-4">
                      {group.members.slice(0, 5).map((m) => (
                        <div
                          key={m.id}
                          className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-medium border-2 border-white"
                        >
                          {getInitials(m.firstName, m.lastName)}
                        </div>
                      ))}
                      {group.members.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-medium border-2 border-white">
                          +{group.members.length - 5}
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    disabled={deleting === group.id}
                    className="ml-4 px-3 py-1.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 p-5">
                    <div className="mb-4">
                      <div className="text-sm font-medium text-slate-700 mb-2">Members</div>
                      {group.members.length === 0 ? (
                        <div className="text-sm text-slate-400">No members</div>
                      ) : (
                        <div className="space-y-2">
                          {group.members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2">
                              <div>
                                <span className="text-sm font-medium text-slate-900">{m.firstName} {m.lastName}</span>
                                <span className="text-xs text-slate-400 ml-2">{m.email}</span>
                              </div>
                              <button
                                onClick={() => handleRemoveMember(group.id, m.id)}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {nonMembers.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-slate-700 mb-2">Add Members</div>
                        <div className="space-y-2">
                          {nonMembers.map((c) => (
                            <div key={c.id} className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2">
                              <span className="text-sm text-slate-700">{c.firstName} {c.lastName}</span>
                              <button
                                onClick={() => handleAddMember(group.id, c.id)}
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                              >
                                Add
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
