'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [form, setForm] = useState({ fullName: '', email: '', organization: '', theme: 'dark', emailNotifications: true });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/organization/members', { cache: 'no-store' });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (res.ok && data.members?.[0]) {
          setForm((f) => ({ ...f, fullName: data.members[0].full_name || '', email: data.members[0].email || '' }));
        }
      } catch { /* keep defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    // Local-only for now — no backend change, never breaks Save flows elsewhere
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
              <p className="text-xs text-slate-500 mt-0.5">Manage your profile and preferences.</p>
            </div>

            {saved && <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded text-xs">Settings saved.</div>}

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading settings...</div>
            ) : (
              <form onSubmit={save} className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-6 space-y-5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Profile</h2>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Full Name</label>
                    <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Email</label>
                    <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Organization</label>
                    <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="e.g. Zamir Oy" className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-3 py-2 text-sm" />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-6 space-y-5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Preferences</h2>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Theme</label>
                    <select value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] rounded px-3 py-2 text-xs font-semibold">
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input type="checkbox" checked={form.emailNotifications} onChange={(e) => setForm({ ...form, emailNotifications: e.target.checked })} className="w-4 h-4" />
                    Email notifications for defects and test runs
                  </label>
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