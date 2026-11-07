'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      setHasSession(Boolean(data.session) && !sessionError);
      setCheckingSession(false);
    };

    void checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setHasSession(Boolean(session));
      setCheckingSession(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Could not update your password. Please request a new reset link and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5] px-4 py-12">
      {/* TestRail Brand Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-[#48a43f] flex items-center justify-center text-white font-bold text-lg shadow-sm">
          TR
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1d2d3e] tracking-tight">QA Management Platform</h1>
          <p className="text-xs text-[#6e7d8c]">Enterprise Test Management</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-white border border-[#d8dee4] rounded-lg shadow-sm p-8">
        <div className="mb-6 pb-4 border-b border-[#e5e9ec]">
          <h2 className="text-lg font-semibold text-[#1d2d3e]">Choose a New Password</h2>
          <p className="text-xs text-[#6e7d8c] mt-0.5">Set a secure password for your account</p>
        </div>

        {checkingSession ? (
          <div className="py-6 text-center text-xs text-[#6e7d8c]">Verifying your reset link...</div>
        ) : !hasSession ? (
          <div className="text-center py-4">
            <p className="text-xs text-[#6e7d8c] mb-4">
              This reset link is invalid or has expired. Please request a new link to continue.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block px-4 py-2 bg-[#48a43f] hover:bg-[#3d8c36] text-white font-semibold rounded text-sm shadow-sm transition"
            >
              Request Another Reset Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition placeholder-[#95a5a6]"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition placeholder-[#95a5a6]"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-[#48a43f] hover:bg-[#3d8c36] text-white font-semibold rounded text-sm shadow-sm transition disabled:opacity-50"
              >
                {saving ? 'Updating password...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[#e5e9ec] text-center text-xs text-[#6e7d8c]">
          <Link href="/auth/login" className="text-[#276fbf] hover:underline font-semibold">
            Back to Sign In
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-[#8c9ba5]">
        &copy; {new Date().getFullYear()} QA Management Platform. All rights reserved.
      </div>
    </div>
  );
}
