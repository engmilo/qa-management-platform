'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { CheckSquare } from 'lucide-react';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // 2FA — REQ-PROD-001
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setChecking(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
      else setChecking(false);
    });
  }, [router]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(''); setMessage(''); setTwoFAError('');
    const supabase = getSupabase();
    if (!supabase) {
      setError('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. Restart npm run dev after adding them.');
      return;
    }
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        // REQ-PROD-001 — check if 2FA is enabled
        try {
          const statusRes = await fetch('/api/auth/2fa/status', { cache: 'no-store' });
          const status = await statusRes.json();
          if (!status.is_enabled) {
            router.replace('/dashboard');
            router.refresh();
            return;
          }
          setShow2FA(true);
          return;
        } catch {
          router.replace('/dashboard');
          router.refresh();
          return;
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() || email.trim().split('@')[0] } },
        });
        if (signUpError) throw signUpError;
        setMessage('Account created. Check your email to confirm, then sign in.');
        setMode('signin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password — sends a reset email. The link in the email goes to /auth/reset-password
  const handleForgot = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(''); setMessage('');
    const supabase = getSupabase();
    if (!supabase) { setError('Missing Supabase env vars in .env.local.'); return; }
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setMessage('Reset link sent. Check your email — only the newest email works, and each link works once. Then click the link in the email to choose a new password.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset link.');
    } finally { setLoading(false); }
  };

  const verify2FA = async () => {
    setTwoFAError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFACode }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Invalid code.');
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setTwoFAError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300';

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7f9] dark:bg-[#101622] text-xs text-slate-500 dark:text-slate-400">
        Checking session...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded bg-[#48a43f] text-white flex items-center justify-center"><CheckSquare className="w-5 h-5" /></div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white leading-none">QA Manager</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Test management for your team</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              {mode === 'forgot' ? 'Forgot password?' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {mode === 'forgot'
                ? 'Enter your email and we will send you a reset link.'
                : mode === 'signin'
                ? 'Welcome back. Enter your credentials to continue.'
                : 'Create an account to start managing QA.'}
            </p>
          </div>

          {mode !== 'forgot' && (
            <div className="px-6">
              <div className="flex bg-slate-100 dark:bg-[#101622] rounded p-1 text-xs font-semibold">
                <button type="button" onClick={() => { setMode('signin'); setError(''); setMessage(''); setShow2FA(false); }} className={`flex-1 py-1.5 rounded ${mode === 'signin' ? 'bg-white dark:bg-[#182232] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Sign in</button>
                <button type="button" onClick={() => { setMode('signup'); setError(''); setMessage(''); setShow2FA(false); }} className={`flex-1 py-1.5 rounded ${mode === 'signup' ? 'bg-white dark:bg-[#182232] shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Sign up</button>
              </div>
            </div>
          )}

          {mode === 'forgot' ? (
            <form onSubmit={handleForgot} className="p-6 space-y-4">
              {error && <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
              {message && <div role="alert" className="p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">{message}</div>}
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" className={inputCls} />
              </div>
              <button disabled={loading} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded shadow-sm">
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => { setMode('signin'); setError(''); setMessage(''); }} className="w-full text-xs font-medium text-[#276fbf] dark:text-[#4da3ff] hover:underline">
                ← Back to Log In
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="p-6 space-y-4">
              {error && <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
              {message && <div role="alert" className="p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">{message}</div>}

              {mode === 'signup' && (
                <div>
                  <label className={labelCls}>Full name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Alex QA" className={inputCls} />
                </div>
              )}
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className={inputCls} />
                <label className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="accent-[#48a43f]" /> Show password
                </label>
                {mode === 'signin' && (
                  <div className="flex justify-end mt-2">
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); setMessage(''); }} className="text-xs text-[#276fbf] dark:text-[#4da3ff] font-semibold hover:underline">
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              {show2FA && mode === 'signin' && (
                <div className="border rounded p-3 space-y-2">
                  <p className="text-xs font-semibold">Enter 2FA code</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Enter the 6-digit code from your authenticator, or a recovery code (XXXX-XXXX).</p>
                  <input
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.toUpperCase())}
                    placeholder="123456 or A3F9-K7Q2"
                    className={inputCls}
                  />
                  {twoFAError && <p className="text-xs text-red-600">{twoFAError}</p>}
                  <button
                    type="button"
                    onClick={verify2FA}
                    disabled={loading || !twoFACode.trim()}
                    className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded shadow-sm"
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              )}

              {!show2FA && (
                <button disabled={loading} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded shadow-sm">
                  {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              )}
              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                {mode === 'signin' ? 'No account yet? ' : 'Already have an account? '}
                <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-[#276fbf] dark:text-[#4da3ff] font-semibold hover:underline">
                  {mode === 'signin' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </form>
          )}
        </div>


      </div>
    </div>
  );
}
