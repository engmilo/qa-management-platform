'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Building2, Users, X, AlertTriangle } from 'lucide-react';

type Member = {
  id?: string; user_id?: string; organization_id?: string; email?: string; full_name?: string; role?: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
  user?: { full_name?: string | null; email?: string | null } | null;
  is_active?: boolean; status?: string;
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', org_admin: 'Org Admin', admin: 'Admin',
  qa_manager: 'Qa Manager', qa_engineer: 'QA Engineer',
  developer: 'Developer', viewer: 'Viewer',
};
const labelFor = (r?: string) => ROLE_LABEL[(r || '').toLowerCase()] || (r ? r.replace('_', ' ') : 'Member');

const FALLBACK: Member[] = [
  { id: 'milo-1', full_name: 'Milo Haireche', email: 'eng.milo@gmail.com', role: 'org_admin', is_active: true },
  { id: 'james-1', full_name: 'James Renaldo', email: 'milo.haireche@icloud.com', role: 'qa_manager', is_active: true },
];

export default function SettingsPage() {
  const [orgName, setOrgName] = useState('Zamir Oy');
  const [activeOrg, setActiveOrg] = useState('Zamir Oy');
  const [orgId, setOrgId] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);
  const [orgError, setOrgError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('qa_engineer');
  const [members, setMembers] = useState<Member[]>(FALLBACK);
  const [msg, setMsg] = useState('')
  const [msgIsError, setMsgIsError] = useState(false)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<Member | null>(null);

  // AUTO_DISMISS_BANNERS - success banners disappear after 4s, no refresh needed
  useEffect(() => { if (!orgSaved) return; const t = setTimeout(() => setOrgSaved(false), 4000); return () => clearTimeout(t); }, [orgSaved]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 4000); return () => clearTimeout(t); }, [msg]);


  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/organizations/members', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const list: Member[] = data.members ?? data.users ?? [];
        if (list.length) setMembers(list);
        const name = data.organization?.name || data.org?.name || '';
        if (name) { setOrgName(name); setActiveOrg(name); }
      } catch {}
      try {
        const r = await fetch('/api/organizations', { cache: 'no-store' });
        const d = await r.json().catch(() => ({}));
        const list = d.organizations ?? [];
        const first = list[0]?.organization ?? list[0];
        if (first?.id) setOrgId(String(first.id));
        if (first?.name) { setOrgName(first.name); setActiveOrg(first.name); }
      } catch {}
    })();
  }, []);

  const nameOf = (m: Member) => m.full_name || m.profiles?.full_name || m.user?.full_name || '—';
  const emailOf = (m: Member) => m.email || m.profiles?.email || m.user?.email || '—';
  const idOf = (m: Member) => m.id || m.user_id || '';

  const saveOrg = async () => {
    if (!orgName.trim()) { setOrgError('Organization Name is required.'); return; }
    if (!orgId) { setOrgError('Could not find organization. Refresh and try again.'); return; }
    setSavingOrg(true); setOrgError(''); setOrgSaved(false);
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(orgId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: orgName.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      const savedName = data.organization?.name ?? orgName.trim();
      setOrgName(savedName); setActiveOrg(savedName); setOrgSaved(true);
    } catch (e) { setOrgError(e instanceof Error ? e.message : 'Could not save.'); } finally { setSavingOrg(false); }
  };

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setMsg('');
    try {
      const res = await fetch('/api/organizations/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not invite.');
      setMsg('Invite sent.');
      setMsgIsError(false)
      setInviteEmail('');
      const r2 = await fetch('/api/organizations/members', { cache: 'no-store' });
      const d2 = await r2.json().catch(() => ({}));
      if (d2.members?.length) setMembers(d2.members);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not invite. User must be registered.');
      setMsgIsError(true)
    }
  };

  const confirmDeactivate = async () => {
    const m = pendingDeactivate; if (!m) return;
    const id = idOf(m);
    setPendingDeactivate(null);
    setDeactivatingId(id);
    setMsg('');
    setMembers((cur) => cur.filter((x) => idOf(x) !== id));
    let ok = false;
    try {
      const r1 = await fetch(`/api/organizations/members/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false, status: 'inactive' }) });
      if (r1.ok) ok = true;
    } catch {}
    if (!ok) {
      try { const r2 = await fetch(`/api/organizations/members/${id}`, { method: 'DELETE' }); if (r2.ok) ok = true; } catch {}
    }
    if (!ok) {
      try { const r3 = await fetch('/api/organizations/members', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: id, user_id: id, is_active: false }) }); if (r3.ok) ok = true; } catch {}
    }
    setDeactivatingId(null);
    setMsg(ok ? `${nameOf(m)} deactivated.` : `${nameOf(m)} removed from list. Note: server deactivate endpoint not found — if they reappear after refresh, the API route needs to be added.`);
    setMsgIsError(!ok);
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight text-left m-0">Organization Settings</h1>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5 mb-5">Manage your team workspace profile, permissions, and members</p>

            

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4 flex items-center gap-6">
              <span className="text-xs font-normal text-slate-900 dark:text-white whitespace-nowrap">ACTIVE ORGANIZATION:</span>
              <select value={activeOrg} onChange={(e) => setActiveOrg(e.target.value)} className="border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-xs font-normal w-full max-w-md">
                <option value={activeOrg} className="text-xs font-normal">{activeOrg}</option>
              </select>
            </div>

            {orgError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{orgError}</div>}
            {orgSaved && <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">Saved.</div>}
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm mb-4 overflow-hidden">
              <div className="p-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#276fbf]" />
                <h2 className="text-xs font-normal tracking-wide text-slate-900 dark:text-white">ORGANIZATION PROFILE</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-normal mb-1.5 text-slate-900 dark:text-white">ORGANIZATION NAME *</label>
                  <input value={orgName} onChange={(e) => { setOrgName(e.target.value); setOrgSaved(false); }} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-xs font-normal" />
                  <button type="button" onClick={saveOrg} disabled={savingOrg} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-normal py-2 rounded mt-2">{savingOrg ? 'Saving...' : 'Save Changes'}</button>
                </div>
                <div>
                  <label className="block text-xs font-normal mb-1.5 text-slate-900 dark:text-white">SUBSCRIPTION PLAN</label>
                  <div className="bg-[#f8fafc] dark:bg-[#141d28] border border-[#e2e8f0] dark:border-[#28374d] rounded p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-normal text-slate-900 dark:text-white">Enterprise QA Tier</p>
                      <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">Unlimited test repositories, suites, executions, and AI assistant access</p>
                    </div>
                    <span className="px-3 py-1.5 rounded text-xs font-normal bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 whitespace-nowrap">Active License</span>
                  </div>
                </div>
              </div>
            </div>

            {msg && <div className={msgIsError ? "mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs" : "mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs"}>{msg}</div>}
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <h2 className="text-xs font-normal tracking-wide text-slate-900 dark:text-white">TEAM & ACCESS CONTROL</h2>
              </div>
              <div className="p-4">
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mb-4">Invite or add registered users to this organization by email address.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-normal mb-1.5 text-slate-900 dark:text-white">ACCOUNT EMAIL</label>
                    <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white placeholder:text-slate-400 rounded px-3 py-2 text-xs font-normal" />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-normal mb-1.5 text-slate-900 dark:text-white">ROLE</label>
                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-xs font-normal">
                      <option value="qa_engineer" className="text-xs font-normal">QA Engineer</option>
                      <option value="qa_manager" className="text-xs font-normal">Qa Manager</option>
                      <option value="org_admin" className="text-xs font-normal">Org Admin</option>
                      <option value="developer" className="text-xs font-normal">Developer</option>
                      <option value="viewer" className="text-xs font-normal">Viewer</option>
                    </select>
                  </div>
                  <button onClick={invite} className="self-end bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-normal px-4 py-2 rounded whitespace-nowrap">Invite</button>
                </div>

                <h3 className="text-xs font-normal tracking-wide text-slate-900 dark:text-white mt-6 mb-3">ACTIVE ORGANIZATION MEMBERS</h3>
                <div className="space-y-2">
                  {members.map((m, i) => {
                    const id = idOf(m);
                    const isYou = i === 0;
                    const busy = deactivatingId === id;
                    return (
                      <div key={id || i} className="flex items-center justify-between border border-[#e2e8f0] dark:border-[#28374d] rounded p-3">
                        <div><p className="text-xs font-normal text-slate-900 dark:text-white">{nameOf(m)}</p><p className="text-xs font-normal text-slate-500 dark:text-slate-400">{emailOf(m)}</p></div>
                        <div className="flex items-center gap-2">
                          {isYou ? (
                            <span className="px-3 py-1.5 rounded text-xs font-normal bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200">{labelFor(m.role)}</span>
                          ) : (
                            <select value={m.role} onChange={async (e) => {
                              const newRole = e.target.value;
                              const res = await fetch('/api/organizations/members', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: (m as any).user_id || id, organization_id: (m as any).organization_id || orgId, role: newRole }) });
                              const d = await res.json().catch(() => ({}));
                              if (!res.ok) { setMsg(d.error || 'Could not change role.'); setMsgIsError(true); return; }
                              setMembers((cur) => cur.map((x) => (idOf(x) === id ? { ...x, role: newRole } : x)));
                              setMsg('Role updated.'); setMsgIsError(false);
                            }} className="px-2 py-1.5 rounded text-xs font-normal bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-transparent">
                              <option value="org_admin">Org Admin</option>
                              <option value="qa_manager">Qa Manager</option>
                              <option value="qa_engineer">QA Engineer</option>
                              <option value="developer">Developer</option>
                              <option value="viewer">Viewer</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                          {isYou ? <span className="text-xs font-normal text-[#276fbf]">You</span> : (
                            <button onClick={() => setPendingDeactivate(m)} disabled={busy} className="inline-flex items-center gap-1 shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 text-white font-normal text-xs px-3 py-1.5 rounded">{busy ? 'Deactivating...' : 'Deactivate'}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* In-app Deactivate confirmation — same style as Test Cases step-remove */}
      {pendingDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPendingDeactivate(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full font-normal bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-600" /></span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Deactivate member?</h3>
              </div>
              <button onClick={() => setPendingDeactivate(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs font-normal text-slate-600 dark:text-slate-300 leading-relaxed">
              Deactivate <span className="text-slate-900 dark:text-white">{nameOf(pendingDeactivate)}</span> ({emailOf(pendingDeactivate)})? They will lose access to this organization.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPendingDeactivate(null)} className="px-3 py-2 rounded border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 text-xs font-normal">Cancel</button>
              <button onClick={confirmDeactivate} className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-normal">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
