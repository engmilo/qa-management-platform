'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const hasRecovery =
      window.location.search.includes('code=') ||
      window.location.hash.includes('type=recovery') ||
      searchParams.get('type') === 'recovery';
    if (hasRecovery) {
      router.replace('/auth/reset-password' + window.location.search + window.location.hash);
      return;
    }
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else router.replace('/dashboard');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setResetSent(true);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] dark:bg-[#101622] flex flex-col items-center justify-center px-4 py-10">
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
        {!showReset ? (
          <>
            <h1 className="text-base font-bold text-white tracking-tight text-left m-0">Log In to Your Account</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 font-normal">Enter your email and password below to continue</p>
            {error && <div className="mb-4 p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1.5">EMAIL ADDRESS</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]" />
              </div>
              <div>
                <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1.5">PASSWORD</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]" />
                <div className="flex justify-end mt-1.5">
                  <button type="button" onClick={() => { setShowReset(true); setError(''); setResetSent(false); }} className="text-xs font-normal text-[#276fbf] dark:text-[#4da3ff] hover:underline">Forgot password?</button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] text-white text-sm font-normal py-2 rounded disabled:opacity-50">{loading ? 'Logging in...' : 'Log In'}</button>
            </form>
            <div className="mt-5 pt-4 border-t border-[#e2e8f0] dark:border-[#28374d] text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">Don&apos;t have an account? <Link href="/auth/signup" className="text-[#276fbf] dark:text-[#4da3ff] font-normal hover:underline">Create an account</Link></p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-base font-normal text-slate-900 dark:text-white">Reset your password</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">Enter your email and we will send you a reset link.</p>
            {error && <div className="mb-4 p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>}
            {resetSent ? (
              <div className="p-3 text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded">Reset link sent to <b>{email}</b>. Check your inbox (and spam). The link opens the reset-password page, not the dashboard.</div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-normal text-slate-700 dark:text-slate-300 mb-1.5">EMAIL ADDRESS</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] text-white text-sm font-normal py-2 rounded disabled:opacity-50">{loading ? 'Sending...' : 'Send reset link'}</button>
              </form>
            )}
            <div className="mt-5 pt-4 border-t border-[#e2e8f0] dark:border-[#28374d] text-center">
              <button type="button" onClick={() => { setShowReset(false); setError(''); setResetSent(false); }} className="text-xs font-normal text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Log In</button>
            </div>
          </>
        )}
      </div>
      <p className="mt-6 text- text-slate-400">© 2026 QA Management Platform. All rights reserved.</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f7f9] dark:bg-[#101622] flex items-center justify-center text-xs text-slate-500">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}