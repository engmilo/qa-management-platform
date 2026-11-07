'use client';

import { useState, type FormEvent } from 'react';
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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    // Keep the response generic so the page does not disclose whether an account exists.
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Reset password</h1>
          <p className="text-muted-foreground mt-2">{sent ? 'Check your email' : 'Enter your account email and we’ll send a reset link.'}</p>
        </div>
        {sent ? (
          <div className="space-y-4 text-center">
            <p role="status" className="text-muted-foreground">If an account uses that address, a password reset email is on its way.</p>
            <Link href="/auth/login" className="text-primary hover:underline">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full px-4 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="you@company.com" required autoComplete="email" />
            </div>
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <div className="text-center text-sm">
              <Link href="/auth/login" className="text-muted-foreground hover:text-primary">Back to sign in</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}