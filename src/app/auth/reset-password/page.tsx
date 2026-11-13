'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get('token_hash');
    const type = params.get('type');

    // token_hash flow — no PKCE verifier needed
    if (token_hash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash, type: 'recovery' }).then(({ error }) => {
        if (error) { setValidLink(false); setReady(true); }
        else { setValidLink(true); setReady(true); }
      });
      return;
    }

    // Fallback: already have session from callback
    let finished = false;
    const finish = (ok: boolean) => {
      if (finished) return;
      finished = true;
      setValidLink(ok);
      setReady(true);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') finish(true);
    });
    let attempts = 0;
    const check = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) { finish(true); return; }
        attempts++;
        if (attempts < 10) setTimeout(check, 300);
        else finish(false);
      });
    };
    check();
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setDone(true);
      await supabase.auth.signOut();
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] dark:bg-[#101622] flex flex-col items-center justify-center px-4 py-10">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded bg-[#48a43f] flex items-center justify-center text-white shrink-0"><ShieldCheck className="w-5 h-5 stroke-[2.5]" /></div>
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight whitespace-nowrap">QA Management Platform</p>
          <p className="text- text-slate-500 dark:text-slate-400">Enterprise Test Management</p>
        </div>
      </div>
      <div className="w-full max-w-sm bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-6">
        <h1 className="dark:text-white text-base font-bold text-slate-900 tracking-tight">Choose a new password</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">Enter and confirm your new password below.</p>
        {!ready && <p className="text-xs text-slate-500 dark:text-slate-400">Checking your reset link...</p>}
        {ready && !validLink && !done && (
          <>
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">This reset link is expired or already used. Please request a new one - only the newest email works, and each link works once.</div>
            <div className="mt-5 text-center"><Link href="/auth/login" className="text-xs font-medium text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Log In</Link></div>
          </>
        )}
        {ready && validLink && !done && (
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && <div className="p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">NEW PASSWORD</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">CONFIRM NEW PASSWORD</label>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] text-white text-sm font-semibold py-2 rounded disabled:opacity-50">{loading ? 'Updating...' : 'Update password'}</button>
          </form>
        )}
        {done && (
          <>
            <div className="p-3 text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded">Password updated. You can now log in with your new password.</div>
            <button onClick={() => { window.location.href = '/auth/login'; }} className="mt-4 w-full bg-[#48a43f] hover:bg-[#3c8b34] text-white text-sm font-semibold py-2 rounded">Go to Log In</button>
          </>
        )}
      </div>
    </div>
  );
}