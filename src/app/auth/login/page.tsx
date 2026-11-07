'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Full redirect ensures session cookies are applied immediately
    window.location.href = '/dashboard';
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
          <h2 className="text-lg font-semibold text-[#1d2d3e]">Log In to Your Account</h2>
          <p className="text-xs text-[#6e7d8c] mt-0.5">Enter your email and password below to continue</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition placeholder-[#95a5a6]"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide">
                Password
              </label>
              <Link href="/auth/forgot-password" className="text-xs text-[#276fbf] hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition placeholder-[#95a5a6]"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#48a43f] hover:bg-[#3d8c36] text-white font-semibold rounded text-sm shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-[#e5e9ec] text-center text-xs text-[#6e7d8c]">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-[#276fbf] hover:underline font-semibold">
            Create an account
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-[#8c9ba5]">
        &copy; {new Date().getFullYear()} QA Management Platform. All rights reserved.
      </div>
    </div>
  );
}
