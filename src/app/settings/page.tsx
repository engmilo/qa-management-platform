'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Save } from 'lucide-react';

type Member = {
  id?: string;
  user_id?: string;
  role?: string;
  email?: string;
  full_name?: string;
  profiles?: { full_name?: string | null; email?: string | null } | null;
  user?: { full_name?: string | null; email?: string | null } | null;
  profile?: { full_name?: string | null; email?: string | null } | null;
};

export default function SettingsPage() {
  const [form, setForm] = useState({ fullName: '', email: '', organization: 'Zamir Oy', orgSlug: 'zamir-oy', theme: 'dark', emailNotifications: true });
  const [members, setMembers] = useState<Member[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/organization/members', { cache: 'no-store' });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        const list: Member[] = data.members ?? data.users ?? [];
        setMembers(list);
        // Fill Profile from first member — handle all shapes: profiles / user / profile / flat
        const first = list[0];
        if (first) {
          const fullName = first.full_name || first.profiles?.full_name || first.user?.full_name || first.profile?.full_name || '';
          const email = first.email || first.profiles?.email || first.user?.email || first.profile?.email || '';
          if (fullName || email) setForm((f) => ({ ...f, fullName: fullName || f.fullName, email: email || f.email }));
        }
        // Organization from API if present
        const orgName = data.organization?.name || data.org?.name || data.organization_name || '';
        if (orgName) setForm((f) => ({ ...f, organization: orgName }));
      } catch { /* keep defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const memberName = (m: Member) => m.full_name || m.profiles?.full_name || m.user?.full_name || m.profile?.full_name || '—';
  const memberEmail = (m: Member) => m.email || m.profiles?.email || m.user?.email || m.profile?.email || '—';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    // Local-only for now — never breaks other Save flows
    setTimeout(() => { setSaving(false); setSaved(true); }, 400);
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="mb-5">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Settings</h1>
              <p className="text-xs text-slate-500 mt-0.5">Manage your profile, organization, team, and preferences.</p>
            </div>

            {saved && <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded text-xs">Settings saved.</div>}

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading settings...</div>
            ) : (
              <form onSubmit={save} className="space-y-4">
                {/* Profile + Organization — old layout */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-6 space-y-5">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Profile</h2>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Full Name</label>
                      <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-xs font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Email</label>
                      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-xs font-semibold" />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-6 space-y-5">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Organization</h2>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Organization Name</label>
                      <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-xs font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Slug</label>
                      <input value={form.orgSlug} onChange={(e) => setForm({ ...form, orgSlug: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-xs font-semibold" />
                    </div>
                  </div>
                </div>

                {/* Team Members — old section */}
                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Team Members</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{members.length} member{members.length === 1 ? '' : 's'}</p>
                  </div>
                  {members.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500">No team members found.</p>
                  ) : (
                    <table className="w-full table-fixed text-left">
                      <colgroup><col className="w-[35%]" /><col className="w-[40%]" /><col className="w-[25%]" /></colgroup>
                      <thead>
                        <tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Name</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Email</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m, i) => (
                          <tr key={m.id || m.user_id || i} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0 align-top">
                            <td className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white break-words whitespace-normal">{memberName(m)}</td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal">{memberEmail(m)}</td>
                            <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200 whitespace-nowrap capitalize">{(m.role || 'member').replace('_', ' ')}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Preferences — old section */}
                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-6 space-y-5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Preferences</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Theme</label>
                      <select value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] rounded px-3 py-2 text-xs font-semibold">
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="system">System</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-6">
                      <input type="checkbox" checked={form.emailNotifications} onChange={(e) => setForm({ ...form, emailNotifications: e.target.checked })} className="w-4 h-4" />
                      Email notifications for defects and test runs
                    </label>
                  </div>
                  <button disabled={saving} className="w-full bg-[#276fbf] hover:bg-[#1e5a9e] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded inline-flex items-center justify-center gap-1"><Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Settings'}</button>
                  <p className="text- text-slate-400">AI Assistant stays on default QA templates for now. Claude key integration comes later.</p>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}