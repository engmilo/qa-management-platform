'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const redirectTo = `${window.location.origin}/auth/update-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } catch {
      setError('Could not reach the authentication service. Please try again.');
    } finally {
      setLoading(false);
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
          <h1 className="whitespace-nowrap text-base font-bold text-slate-900 tracking-tight">QA Management Platform</h1>
          <p className="text-xs text-[#6e7d8c]">Enterprise Test Management</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-lg shadow-sm p-8">
        <div className="mb-6 pb-4 border-b border-[#e5e9ec]">
          <h2 className="text-lg font-semibold text-[#1d2d3e]">Reset Password</h2>
          <p className="text-xs text-[#6e7d8c] mt-0.5">
            {sent ? 'Check your email inbox' : 'Enter your email to receive a password reset link'}
          </p>
        </div>

        {sent ? (
          <div className="text-center py-4" role="status">
            <div className="w-12 h-12 bg-green-50 text-[#48a43f] border border-green-200 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              ✓
            </div>
            <p className="text-sm text-[#1d2d3e] font-medium mb-1">Reset instructions sent</p>
            <p className="text-xs text-[#6e7d8c] mb-6">
              If an account exists for <span className="font-semibold text-[#1d2d3e]">{email.trim()}</span>, you will receive an email shortly with instructions.
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-4 py-2 bg-[#48a43f] hover:bg-[#3d8c36] text-white font-semibold rounded text-sm shadow-sm transition"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div role="alert" className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded font-normal text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition placeholder-[#95a5a6]"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#48a43f] hover:bg-[#3d8c36] text-white font-semibold rounded text-sm shadow-sm transition disabled:opacity-50"
              >
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[#e5e9ec] text-center text-xs text-[#6e7d8c]">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-[#276fbf] hover:underline font-semibold">
            Return to log in
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-[#8c9ba5]">
        &copy; {new Date().getFullYear()} QA Management Platform. All rights reserved.
      </div>
    </div>
  );
}