'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ShieldCheck } from 'lucide-react';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // If already logged in, go to dashboard
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);

    if (error) { setError(error.message); return; }

    // If email confirmation is OFF, Supabase returns a session right away
    if (data.session) {
      router.replace('/dashboard');
      return;
    }
    // If email confirmation is ON, no session yet - tell user to check inbox
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] dark:bg-[#101622] flex flex-col items-center justify-center px-4 py-10">
      {/* LOGO - green shield, same as login + sidebar */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded bg-[#48a43f] flex items-center justify-center text-white shrink-0">
          <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <p className="text-lg font-normal text-slate-900 dark:text-white leading-tight whitespace-nowrap">QA Management Platform</p>
          <p className="text- text-slate-500 dark:text-slate-400">Enterprise Test Management</p>
        </div>
      </div>

      <div className="w-full max-w-sm dark:bg-[#182232] dark:border-[#28374d] p-6">
        <h1 className="text-base font-bold text-white tracking-tight text-left m-0">Create an account</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 font-normal">Enter your details below to get started</p>

        {error && (
          <div className="mb-4 p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>
        )}

        {sent ? (
          <div className="p-3 text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded">
            Account created for <b>{email}</b>. Check your inbox to confirm your email, then log in.
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1.5">FULL NAME</label>
              <input
                type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Milo Haireche"
                className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1.5">EMAIL ADDRESS</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1.5">PASSWORD</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1.5">CONFIRM PASSWORD</label>
              <input
                type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]"
              />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] text-white text-sm font-normal py-2 rounded disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}

        <div className="mt-5 pt-4 border-t border-[#e2e8f0] dark:border-[#28374d] text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Already have an account? <Link href="/auth/login" className="text-[#276fbf] dark:text-[#4da3ff] font-normal hover:underline">Log In</Link></p>
        </div>
      </div>

      <p className="mt-6 text- text-slate-400">© 2026 QA Management Platform. All rights reserved.</p>
    </div>
  );
}