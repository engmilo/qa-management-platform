'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
          <p className="text-muted-foreground mt-2">
            {sent ? 'Check your email' : 'Enter your email to reset'}
          </p>
        </div>
        
        {!sent ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@company.com"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              We've sent a password reset link to {email}
            </p>
            <Link href="/auth/login" className="text-primary hover:underline">
              Back to Sign In
            </Link>
          </div>
        )}
        
        <div className="mt-6 text-center text-sm">
          <Link href="/auth/login" className="text-muted-foreground hover:text-primary">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
