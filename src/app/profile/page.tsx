'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) {
        window.location.href = '/auth/login';
        return;
      }
      setEmail(user.email ?? '');
      setFullName(String(user.user_metadata?.full_name || user.user_metadata?.name || ''));
      setCreatedAt(user.created_at ? new Date(user.created_at).toLocaleDateString() : '');
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    setSaving(false);
    if (error) setError(error.message);
    else setMessage('Profile updated.');
  };

  const initials = (() => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'MH';
    return ((parts[0][0] || 'M') + (parts[1]?.[0] || 'H')).toUpperCase();
  })();

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <Link href="/dashboard" className="text-xs text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Dashboard</Link>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">My Profile</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-6">Your logged-in account details.</p>

            {loading ? (
              <p className="text-xs text-slate-500">Loading profile...</p>
            ) : (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-12 h-12 rounded-full bg-[#276fbf] text-white text-sm font-normal flex items-center justify-center">{initials}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{fullName || 'No name set'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
                    {createdAt && <p className="text- text-slate-400 mt-0.5">Member since {createdAt}</p>}
                  </div>
                </div>

                {message && <div className="mb-4 p-2.5 text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded">{message}</div>}
                {error && <div className="mb-4 p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>}

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">FULL NAME</label>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#276fbf]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">EMAIL ADDRESS</label>
                    <input value={email} disabled
                      className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-slate-50 dark:bg-slate-800/50 rounded font-normal px-3 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                    <p className="text- text-slate-400 mt-1">Email cannot be changed here.</p>
                  </div>
                  <button type="submit" disabled={saving} className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-4 py-2 rounded disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}