'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [noToken, setNoToken] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  // Prevents StrictMode double-exchange of the same ?code=
  const exchangingRef = useRef(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const search = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const urlError = search.get('error');
    const urlErrorCode = search.get('error_code');
    const urlErrorDesc = search.get('error_description');
    const code = search.get('code');

    const hasToken =
      !!code ||
      hash.includes('access_token=') ||
      hash.includes('type=recovery') ||
      !!search.get('token_hash');

    if (!hasToken && !urlError) {
      setNoToken(true);
      setReady(true);
      return;
    }

    if (urlError) {
      setError(
        urlErrorCode === 'otp_expired'
          ? 'This reset link is expired or already used. Please request a new one - only the newest email works, and each link works once.'
          : decodeURIComponent(urlErrorDesc || 'This reset link is invalid. Please request a new one.')
      );
      setReady(true);
      return;
    }

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      setValidLink(ok);
      setReady(true);
    };

    // PKCE flow: ?code=...
    if (code) {
      // StrictMode runs this effect twice - second run must NOT re-exchange
      if (exchangingRef.current) return;
      exchangingRef.current = true;

      // If we already have a session (first StrictMode run already exchanged),
      // do NOT exchange again.
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) { finish(true); return; }

        supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
          if (!error) { finish(true); return; }
          // Exchange failed - but maybe the first run already succeeded?
          // Check session again before showing "expired".
          const { data: retry } = await supabase.auth.getSession();
          if (retry.session) { finish(true); return; }
          setError('This reset link is expired or already used. Please request a new one - only the newest email works, and each link works once.');
          finish(false);
        });
      });
      return;
    }

    // Hash flow: #access_token=...&type=recovery
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') finish(true);
      if (event === 'SIGNED_IN') {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) finish(true);
        });
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(true);
    });

    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) finish(true);
        else {
          setError('This reset link is expired or already used. Please request a new one - only the newest email works, and each link works once.');
          finish(false);
        }
      });
    }, 5000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
        <div className="w-8 h-8 rounded bg-[#48a43f] flex items-center justify-center text-white shrink-0">
          <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">QA Management Platform</p>
          <p className="text- text-slate-500 dark:text-slate-400">Enterprise Test Management</p>
        </div>
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-6">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">Choose a new password</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">Enter and confirm your new password below.</p>

        {!ready && <p className="text-xs text-slate-500 dark:text-slate-400">Checking your reset link...</p>}

        {ready && noToken && !done && (
          <>
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">
              No reset token found in this link. Click the full link in the newest reset email - it must contain a token.
            </div>
            <div className="mt-5 text-center">
              <Link href="/auth/login" className="text-xs font-medium text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Log In to request a new link</Link>
            </div>
          </>
        )}

        {ready && !noToken && !validLink && !done && (
          <>
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">
              {error || 'This reset link is expired or invalid. Please request a new one.'}
            </div>
            <div className="mt-5 text-center">
              <Link href="/auth/login" className="text-xs font-medium text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Log In</Link>
            </div>
          </>
        )}

        {ready && validLink && !done && (
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && <div className="p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">NEW PASSWORD</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">CONFIRM NEW PASSWORD</label>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
                className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] text-white text-sm font-semibold py-2 rounded disabled:opacity-50">
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}

        {done && (
          <>
            <div className="p-3 text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded">
              Password updated. You can now log in with your new password.
            </div>
            <button onClick={() => { window.location.href = '/auth/login'; }} className="mt-4 w-full bg-[#48a43f] hover:bg-[#3c8b34] text-white text-sm font-semibold py-2 rounded">
              Go to Log In
            </button>
          </>
        )}
      </div>
    </div>
  );
}