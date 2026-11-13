'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5] px-4 py-12">
      {/* TestRail Brand Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center text-white font-bold text-lg">
          TR
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight text-left m-0">QA Management Platform</h1>
          <p className="text-xs text-[#6e7d8c] font-normal">Enterprise Test Management</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-lg shadow-sm p-8">
        <div className="mb-6 pb-4 border-b border-[#e5e9ec]">
          <h2 className="text-lg font-semibold text-[#1d2d3e]">Create Your Account</h2>
          <p className="text-xs text-[#6e7d8c] mt-0.5">Start managing your QA projects and tests</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded font-normal text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition placeholder-[#95a5a6]"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded font-normal text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition placeholder-[#95a5a6]"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded font-normal text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition placeholder-[#95a5a6]"
              placeholder="••••••••"
              required
              minLength={8}
            />
            <p className="text-[11px] text-[#6e7d8c] mt-1">Must be at least 8 characters</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#48a43f] hover:bg-[#3d8c36] text-white font-semibold rounded text-sm shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-[#e5e9ec] text-center text-xs text-[#6e7d8c]">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#276fbf] hover:underline font-semibold">
            Sign in
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-[#8c9ba5]">
        &copy; {new Date().getFullYear()} QA Management Platform. All rights reserved.
      </div>
    </div>
  );
}