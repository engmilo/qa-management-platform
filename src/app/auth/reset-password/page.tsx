'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { ShieldCheck } from 'lucide-react';

// IMPORTANT: This page must NEVER auto-redirect to /dashboard when a session exists.
// A password-recovery link creates a temporary session — if we redirect, the user
// lands on Dashboard and can never set a new password.
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  // For the "request a new link" form when the link is invalid / missing
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    // NEW: Supabase now sends ?token_hash=pkce_...&type=recovery (see your screenshot URL)
    const tokenHash = params.get('token_hash');
    const type = params.get('type');

    const finish = (ok: boolean) => {
      setValidLink(ok);
      setReady(true);
    };

    // Case 1: ?token_hash=...&type=recovery — PKCE flow (current Supabase format)
    if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
        if (error) setError('This reset link is expired or already used. Please request a new one - only the newest email works, and each link works once.');
        finish(!error);
      });
      return;
    }

    // Case 2: ?code=... in URL (older PKCE flow) — exchange it for a recovery session
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setError('This reset link is expired or already used. Please request a new one - only the newest email works, and each link works once.');
        finish(!error);
      });
      return;
    }

    // Case 3: #access_token=...&type=recovery in hash — Supabase JS picks it up automatically.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') finish(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(true);
      else {
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: d2 }) => {
            if (!d2.session) {
              setError('This reset link is expired or already used. Please request a new one - only the newest email works, and each link works once.');
              finish(false);
            }
          });
        }, 800);
      }
    });
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

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendMessage('');
    if (!resendEmail.trim()) { setResendMessage('Enter your email first.'); return; }
    setResendLoading(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setResendLoading(false);
    if (error) setResendMessage(error.message);
    else setResendMessage('Reset link sent. Check your email — only the newest email works, and each link works once.');
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] dark:bg-[#101622] flex flex-col items-center justify-center px-4 py-10">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded bg-[#48a43f] flex items-center justify-center text-white shrink-0"><ShieldCheck className="w-5 h-5 stroke-[2.5]" /></div>
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">QA Management Platform</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Enterprise Test Management</p>
        </div>
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-6">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">Choose a new password</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">Enter and confirm your new password below.</p>

        {!ready && <p className="text-xs text-slate-500 dark:text-slate-400">Checking your reset link...</p>}

        {ready && !validLink && !done && (
          <>
            <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">
              {error || 'This reset link is expired or invalid. Please request a new one.'}
            </div>
            <form onSubmit={handleResend} className="mt-5 space-y-3">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Request a new reset link</p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">EMAIL</label>
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]"
                />
              </div>
              {resendMessage && (
                <div className={`p-2.5 text-xs rounded border ${resendMessage.includes('sent') ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900'}`}>
                  {resendMessage}
                </div>
              )}
              <button type="submit" disabled={resendLoading} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] text-white text-sm font-semibold py-2 rounded disabled:opacity-50">
                {resendLoading ? 'Sending...' : 'Send new reset link'}
              </button>
            </form>
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
