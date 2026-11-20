"use client";

import { useEffect, useState } from "react";

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix?: string | null;
  key_last4?: string | null;
  last4?: string | null;
  scopes?: string[] | string | null;
  created_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  created_by_email?: string | null;
  created_by?: string | null;
};

const SCOPE_OPTIONS = [
  { value: "runs:read", label: "Runs — Read" },
  { value: "runs:write", label: "Runs — Write" },
  { value: "suites:read", label: "Suites — Read" },
  { value: "suites:write", label: "Suites — Write" },
  { value: "cases:read", label: "Test Cases — Read" },
  { value: "cases:write", label: "Test Cases — Write" },
];

function scopesToArray(s: ApiKeyRow["scopes"]): string[] {
  if (!s) return [];
  if (Array.isArray(s)) return s;
  try {
    const parsed = JSON.parse(s as string);
    return Array.isArray(parsed) ? parsed : [s as string];
  } catch {
    return (s as string).split(",").map((x) => x.trim()).filter(Boolean);
  }
}

function fmtDate(v?: string | null) {
  if (!v) return "Never";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function isExpired(v?: string | null) {
  if (!v) return false;
  return new Date(v).getTime() < Date.now();
}

export default function ApiKeysPage() {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>(["runs:write"]);
  const [expiry, setExpiry] = useState<string>("30");
  const [customDate, setCustomDate] = useState("");
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [newKey, setNewKey] = useState<{ value: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/api-keys");
      const j = await res.json().catch(() => ({}));
      const list = j.apiKeys ?? j.keys ?? j.data ?? [];
      setKeys(Array.isArray(list) ? list : []);
    } catch {
      setKeys([]);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleScope = (v: string) => {
    setSelected((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const handleCreate = async () => {
    setError("");
    setCopied(false);
    if (!name.trim()) { setError("Enter a key name."); return; }
    if (!selected.length) { setError("Pick at least one scope."); return; }
    let expires_at: string | null = null;
    if (expiry === "custom") {
      if (!customDate) { setError("Pick an expiry date."); return; }
      expires_at = new Date(customDate + "T23:59:59").toISOString();
    } else if (expiry !== "never") {
      const days = parseInt(expiry, 10);
      expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes: selected, expires_at }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error || "Could not create key."); return; }
      const value = j.apiKey?.value ?? j.value ?? j.key ?? "";
      if (value) setNewKey({ value, name: name.trim() });
      setName("");
      await load();
    } catch {
      setError("Could not create key.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    try { await navigator.clipboard.writeText(newKey.value); setCopied(true); } catch {}
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this key? It will stop working immediately.")) return;
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (newKey) setNewKey(null);
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-normal">API Keys</h1>
        <p className="text-sm text-slate-400 mt-1">Manage API keys for this organization. Keys are stored hashed — full key is shown once on create.</p>
      </div>

      {newKey && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
          <p className="font-normal text-emerald-300">Key created — copy it now. It will not be shown again.</p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <code className="flex-1 break-all rounded bg-slate-950 px-3 py-2 text-sm">{newKey.value}</code>
            <button onClick={handleCopy} className="rounded bg-white px-4 py-2 text-sm font-normal text-slate-900">{copied ? "Copied" : "Copy"}</button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Saved for: {newKey.name} — refresh the page and this banner disappears.</p>
        </div>
      )}
      {error && <p className="rounded bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="rounded-lg border border-slate-700/60 bg-slate-900/60">
        <div className="border-b border-slate-700/60 px-4 py-3"><h2 className="font-normal">Create API Key</h2></div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-normal text-slate-400 mb-1">KEY NAME</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CI Pipeline, Runs Only" className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-normal outline-none focus:border-slate-500" />
          </div>

          <div>
            <label className="block text-xs font-normal text-slate-400 mb-1">SCOPES — what this key can do</label>
            <p className="text-xs text-slate-500 mb-2">For TC-PROD-010, pick only Runs — Write and leave Suites unchecked.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SCOPE_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal cursor-pointer">
                  <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggleScope(o.value)} className="accent-blue-500" />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Selected: {selected.join(", ") || "none"}</p>
          </div>

          <div>
            <label className="block text-xs font-normal text-slate-400 mb-1">EXPIRY</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-normal outline-none">
                <option value="never">Never expires</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="custom">Custom date…</option>
              </select>
              {expiry === "custom" && (
                <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-normal" />
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Expiry is shown in the list below. Never = no expiry date.</p>
          </div>

          <button onClick={handleCreate} disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-sm font-normal text-white disabled:opacity-50">{loading ? "Creating…" : "Create Key"}</button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700/60 bg-slate-900/60">
        <div className="border-b border-slate-700/60 px-4 py-3"><h2 className="font-normal">Active API Keys</h2></div>
        <div className="divide-y divide-slate-800">
          {keys.length === 0 && <p className="px-4 py-4 text-sm text-slate-400">No API keys yet.</p>}
          {keys.filter((k) => !k.revoked_at).map((k) => {
            const sc = scopesToArray(k.scopes);
            const last4 = k.key_last4 || k.last4 || "";
            const expired = isExpired(k.expires_at);
            return (
              <div key={k.id} className="flex flex-col lg:flex-row lg:items-center gap-2 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-normal truncate">{k.name}</p>
                  <p className="text-sm text-slate-400 truncate">
                    {last4 ? <span>…{last4}</span> : <span>{k.key_prefix ?? "qa_…"}</span>}
                    <span> • Scopes: {sc.join(", ") || "none"}</span>
                    <span> • Created {fmtDate(k.created_at)}</span>
                    <span> • Expires {fmtDate(k.expires_at)}</span>
                    {k.created_by_email && <span> by {k.created_by_email}</span>}
                  </p>
                  {expired && <p className="text-xs text-red-300 mt-1">Expired</p>}
                  {!last4 && <p className="text-xs text-slate-500">Old key — last 4 not stored. Revoke and create a new one to see last 4.</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-500/15 px-2 py-1 text-xs font-normal text-emerald-300">{expired ? "Expired" : "Active"}</span>
                  <button onClick={() => handleRevoke(k.id)} className="rounded bg-red-600 px-3 py-1.5 text-sm font-normal text-white">Revoke</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
