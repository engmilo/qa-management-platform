'use client';
// src/app/settings/api-keys/page.tsx
// REQ-PROD-002 API Keys — TC-PROD-006 to 010
// Only Org Admin can create / revoke. Others see read-only list.
// Same style as Settings page: text-xs, font-normal, no bold titles.
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Key, X, AlertTriangle, Copy, Check } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

type ApiKey = {
  id: string; name: string; key_prefix: string; created_by_email?: string;
  is_active: boolean; revoked_at?: string | null; last_used_at?: string | null; created_at: string;
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', org_admin: 'Org Admin', admin: 'Admin',
  qa_manager: 'Qa Manager', qa_engineer: 'QA Engineer', developer: 'Developer', viewer: 'Viewer',
};
const labelFor = (r?: string) => ROLE_LABEL[(r || '').toLowerCase()] || (r ? r.replace('_', ' ') : 'Member');

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState('');
  const [msg, setMsg] = useState('');
  const [msgIsError, setMsgIsError] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [creating, setCreating] = useState(false);
  const [newFullKey, setNewFullKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<ApiKey | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const effectiveRole = currentUserRole.toLowerCase();
  const isOrgAdmin = effectiveRole === 'org_admin' || effectiveRole === 'super_admin' || effectiveRole === 'admin';

  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); }, [msg]);

  const load = async () => {
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setCurrentUserEmail(String(user.email));
      // Role from members list — same as Settings fix v2
      try {
        const r = await fetch('/api/organizations/members', { cache: 'no-store' });
        const d = await r.json().catch(() => ({}));
        const list = d.members ?? d.users ?? [];
        const me = list.find((m: any) => {
          const email = m.email || m.profiles?.email || m.user?.email || '';
          return user?.email && email.toLowerCase() === String(user.email).toLowerCase();
        });
        if (me?.role) setCurrentUserRole(String(me.role));
      } catch {}
      const res = await fetch('/api/api-keys', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data.api_keys) setKeys(data.api_keys);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!isOrgAdmin) { setMsg('Only Org Admin can create API keys.'); setMsgIsError(true); return; }
    if (!keyName.trim()) { setMsg('Key name is required.'); setMsgIsError(true); return; }
    setCreating(true); setMsg(''); setNewFullKey(''); setCopied(false);
    try {
      const res = await fetch('/api/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: keyName.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not create key.');
      setNewFullKey(data.full_key || '');
      setKeyName('');
      setMsg('API key created. Copy it now — you will not see it again.');
      setMsgIsError(false);
      await load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not create key.'); setMsgIsError(true); } finally { setCreating(false); }
  };

  const confirmRevoke = async () => {
    const k = pendingRevoke; if (!k) return;
    if (!isOrgAdmin) { setPendingRevoke(null); setMsg('Only Org Admin can revoke API keys.'); setMsgIsError(true); return; }
    setPendingRevoke(null); setRevokingId(k.id); setMsg('');
    try {
      const res = await fetch(`/api/api-keys/${k.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not revoke.');
      setKeys((cur) => cur.map((x) => x.id === k.id ? { ...x, is_active: false, revoked_at: new Date().toISOString() } : x));
      setMsg(`${k.name} revoked.`); setMsgIsError(false);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not revoke.'); setMsgIsError(true); } finally { setRevokingId(null); }
  };

  const copyKey = async () => {
    try { await navigator.clipboard.writeText(newFullKey); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight text-left m-0">API Keys</h1>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5 mb-5">Manage API keys for this organization. Keys are stored hashed — full key is shown once on create.</p>

            {msg && <div className={msgIsError ? "mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs" : "mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs"}>{msg}</div>}

            {newFullKey && (
              <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-md p-4 mb-4">
                <p className="text-xs font-normal text-green-700 dark:text-green-300">Your new API key — copy it now. You will not see it again.</p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-white dark:bg-[#1f2c3f] border border-green-200 dark:border-green-900 rounded px-3 py-2 text-xs font-normal text-slate-900 dark:text-white break-all">{newFullKey}</code>
                  <button onClick={copyKey} className="inline-flex items-center gap-1 bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-normal px-3 py-2 rounded shrink-0">{copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}</button>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden mb-4">
              <div className="p-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#276fbf]" />
                <h2 className="text-xs font-normal tracking-wide text-slate-900 dark:text-white">CREATE API KEY</h2>
              </div>
              <div className="p-4">
                {isOrgAdmin ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-normal mb-1.5 text-slate-900 dark:text-white">KEY NAME</label>
                      <input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. CI Pipeline, Zapier, External QA" className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white placeholder:text-slate-400 rounded px-3 py-2 text-xs font-normal" />
                    </div>
                    <button onClick={createKey} disabled={creating} className="self-end bg-[#276fbf] hover:bg-[#1e5a9e] disabled:opacity-50 text-white text-xs font-normal px-4 py-2 rounded whitespace-nowrap">{creating ? 'Creating...' : 'Create Key'}</button>
                  </div>
                ) : (
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Only Org Admin can create API keys.{currentUserEmail ? ` You are viewing as ${labelFor(currentUserRole)}.` : ' Checking your role…'}</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center gap-2">
                <Key className="w-4 h-4 text-green-600" />
                <h2 className="text-xs font-normal tracking-wide text-slate-900 dark:text-white">ACTIVE API KEYS</h2>
              </div>
              <div className="p-4">
                {keys.length === 0 ? (
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">No API keys yet.</p>
                ) : (
                  <div className="space-y-2">
                    {keys.map((k) => {
                      const busy = revokingId === k.id;
                      return (
                        <div key={k.id} className="flex items-center justify-between border border-[#e2e8f0] dark:border-[#28374d] rounded p-3">
                          <div>
                            <p className="text-xs font-normal text-slate-900 dark:text-white">{k.name}</p>
                            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{k.key_prefix} • Created {new Date(k.created_at).toLocaleDateString()} {k.created_by_email ? `by ${k.created_by_email}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={k.is_active ? "px-3 py-1.5 rounded text-xs font-normal bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "px-3 py-1.5 rounded text-xs font-normal bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200"}>{k.is_active ? 'Active' : 'Revoked'}</span>
                            {k.is_active && isOrgAdmin && (
                              <button onClick={() => setPendingRevoke(k)} disabled={busy} className="inline-flex items-center gap-1 shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 text-white font-normal text-xs px-3 py-1.5 rounded">{busy ? 'Revoking...' : 'Revoke'}</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {pendingRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPendingRevoke(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full font-normal bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-600" /></span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Revoke API key?</h3>
              </div>
              <button onClick={() => setPendingRevoke(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs font-normal text-slate-600 dark:text-slate-300 leading-relaxed">Revoke <span className="text-slate-900 dark:text-white">{pendingRevoke.name}</span> ({pendingRevoke.key_prefix})? It will stop working immediately.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPendingRevoke(null)} className="px-3 py-2 rounded border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 text-xs font-normal">Cancel</button>
              <button onClick={confirmRevoke} className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-normal">Revoke</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
