'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const [mode, setMode] = useState<'invite' | 'reset'>('reset');
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setMode(new URLSearchParams(window.location.search).get('mode') === 'invite' ? 'invite' : 'reset');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && active) {
        setHasSession(true);
        setError('');
      }
    });

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (data.session) {
        setHasSession(true);
      } else if (sessionError) {
        setError(sessionError.message);
      }
      setChecking(false);
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
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
    window.setTimeout(() => { window.location.href = '/dashboard'; }, 900);
  };

  const title = mode === 'invite' ? 'Activate your account' : 'Choose a new password';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-2">
            {mode === 'invite' ? 'Set a password to finish joining your organization.' : 'Choose a new password for your account.'}
          </p>
        </div>
        {checking ? (
          <p className="text-center text-muted-foreground">Checking your secure link...</p>
        ) : !hasSession ? (
          <div className="space-y-4 text-center">
            <p role="alert" className="text-sm text-red-400">{error || 'This link is invalid or has expired.'}</p>
            {mode === 'reset' ? (
              <Link href="/auth/forgot-password" className="text-primary hover:underline">Request another reset link</Link>
            ) : (
              <p className="text-sm text-muted-foreground">Ask your organization admin to send a new invitation.</p>
            )}
          </div>
        ) : saved ? (
          <p role="status" className="text-center text-green-400">Password saved. Opening your workspace...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-foreground mb-2">New password</label>
              <input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full px-4 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary" autoComplete="new-password" minLength={8} required />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground mb-2">Confirm password</label>
              <input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full px-4 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary" autoComplete="new-password" minLength={8} required />
            </div>
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={saving} className="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Saving...' : mode === 'invite' ? 'Activate account' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}