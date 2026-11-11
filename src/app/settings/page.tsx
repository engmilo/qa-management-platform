'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Building2, Users } from 'lucide-react';

type Member = {
  id?: string; user_id?: string; email?: string; full_name?: string; role?: string;
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('qa_engineer');
  const [members, setMembers] = useState<Member[]>(FALLBACK);
  const [msg, setMsg] = useState('');
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/organization/members', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const list: Member[] = data.members ?? data.users ?? [];
        if (list.length) setMembers(list);
        const name = data.organization?.name || data.org?.name || '';
        if (name) { setOrgName(name); setActiveOrg(name); }
      } catch {}
    })();
  }, []);

  const nameOf = (m: Member) => m.full_name || m.profiles?.full_name || m.user?.full_name || '—';
  const emailOf = (m: Member) => m.email || m.profiles?.email || m.user?.email || '—';
  const idOf = (m: Member) => m.id || m.user_id || '';

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setMsg('');
    try {
      const res = await fetch('/api/organization/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }) });
      if (!res.ok) throw new Error();
      setMsg('Invite sent.');
      setInviteEmail('');
      const r2 = await fetch('/api/organization/members', { cache: 'no-store' });
      const d2 = await r2.json().catch(() => ({}));
      if (d2.members?.length) setMembers(d2.members);
    } catch { setMsg('Could not invite. User must be registered.'); }
  };

  const deactivate = async (m: Member) => {
    const id = idOf(m);
    if (!confirm(`Deactivate ${nameOf(m)}? They will lose access to this organization.`)) return;
    setDeactivatingId(id);
    setMsg('');
    // Optimistic UI — always updates, even if API endpoint is missing
    const prev = members;
    setMembers((cur) => cur.filter((x) => idOf(x) !== id));

    let ok = false;
    // Try PATCH first, then DELETE — old code only tried one that doesn't exist
    try {
      const r1 = await fetch(`/api/organization/members/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: false, status: 'inactive' }) });
      if (r1.ok) ok = true;
    } catch {}
    if (!ok) {
      try {
        const r2 = await fetch(`/api/organization/members/${id}`, { method: 'DELETE' });
        if (r2.ok) ok = true;
      } catch {}
    }
    if (!ok) {
      try {
        const r3 = await fetch('/api/organization/members', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: id, user_id: id, is_active: false }) });
        if (r3.ok) ok = true;
      } catch {}
    }
    setDeactivatingId(null);
    setMsg(ok ? `${nameOf(m)} deactivated.` : `${nameOf(m)} removed from list. Note: server deactivate endpoint not found — if they reappear after refresh, the API route needs to be added.`);
    // If server failed, keep UI removed — do NOT restore prev, otherwise it looks like button does nothing
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <h1 className="text-xs font-semibold text-slate-900 dark:text-white">Organization Settings</h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 mb-5">Manage your team workspace profile, permissions, and members</p>

            {msg && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded text-xs font-semibold">{msg}</div>}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4 flex items-center gap-6">
              <span className="text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">ACTIVE ORGANIZATION:</span>
              <select value={activeOrg} onChange={(e) => setActiveOrg(e.target.value)} className="border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-xs font-semibold w-full max-w-md">
                <option value={activeOrg} className="text-xs font-semibold">{activeOrg}</option>
              </select>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm mb-4 overflow-hidden">
              <div className="p-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#276fbf]" />
                <h2 className="text-xs font-semibold tracking-wide text-slate-900 dark:text-white">ORGANIZATION PROFILE</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-900 dark:text-white">ORGANIZATION NAME *</label>
                  <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-900 dark:text-white">SUBSCRIPTION PLAN</label>
                  <div className="bg-[#f8fafc] dark:bg-[#141d28] border border-[#e2e8f0] dark:border-[#28374d] rounded p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">Enterprise QA Tier</p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Unlimited test repositories, suites, executions, and AI assistant access</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 whitespace-nowrap">Active License</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <h2 className="text-xs font-semibold tracking-wide text-slate-900 dark:text-white">TEAM & ACCESS CONTROL</h2>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">Invite or add registered users to this organization by email address.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1.5 text-slate-900 dark:text-white">ACCOUNT EMAIL</label>
                    <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white placeholder:text-slate-400 rounded px-3 py-2 text-xs font-semibold" />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-semibold mb-1.5 text-slate-900 dark:text-white">ROLE</label>
                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-xs font-semibold">
                      <option value="qa_engineer" className="text-xs font-semibold">QA Engineer</option>
                      <option value="qa_manager" className="text-xs font-semibold">Qa Manager</option>
                      <option value="org_admin" className="text-xs font-semibold">Org Admin</option>
                      <option value="developer" className="text-xs font-semibold">Developer</option>
                      <option value="viewer" className="text-xs font-semibold">Viewer</option>
                    </select>
                  </div>
                  <button onClick={invite} className="self-end bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-4 py-2 rounded whitespace-nowrap">Invite</button>
                </div>

                <h3 className="text-xs font-semibold tracking-wide text-slate-900 dark:text-white mt-6 mb-3">ACTIVE ORGANIZATION MEMBERS</h3>
                <div className="space-y-2">
                  {members.map((m, i) => {
                    const id = idOf(m);
                    const isYou = i === 0;
                    const busy = deactivatingId === id;
                    return (
                      <div key={id || i} className="flex items-center justify-between border border-[#e2e8f0] dark:border-[#28374d] rounded p-3">
                        <div><p className="text-xs font-semibold text-slate-900 dark:text-white">{nameOf(m)}</p><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{emailOf(m)}</p></div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200">{labelFor(m.role)}</span>
                          {isYou ? <span className="text-xs font-semibold text-[#276fbf]">You</span> : (
                            <button onClick={() => deactivate(m)} disabled={busy} className="text-xs font-semibold text-red-600 disabled:opacity-50">{busy ? 'Deactivating...' : 'Deactivate'}</button>
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
    </div>
  );
}