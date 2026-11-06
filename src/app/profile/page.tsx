'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { useAuth } from '@/components/auth/AuthProvider';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setFullName(String(user?.user_metadata?.full_name || user?.user_metadata?.name || ''));
    setEmail(user?.email || '');
  }, [user?.id, user?.email, user?.user_metadata]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const { supabase } = await import('@/lib/supabase/client');
      const nameChanged = fullName.trim() !== String(user.user_metadata?.full_name || user.user_metadata?.name || '');
      const emailChanged = email.trim().toLowerCase() !== (user.email || '').toLowerCase();

      if (!nameChanged && !emailChanged) {
        setMessage('Your profile is already up to date.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        ...(emailChanged ? { email: email.trim() } : {}),
        ...(nameChanged ? { data: { ...user.user_metadata, full_name: fullName.trim() } } : {}),
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage(emailChanged
        ? 'Profile saved. Check your inbox to confirm the new email address.'
        : 'Profile saved successfully.');
    } catch {
      setError('Could not reach the authentication service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-foreground mb-2">My Profile</h1>
            <p className="text-sm text-muted-foreground mb-6">Update the name and email associated with your account.</p>

            {authLoading ? (
              <p className="text-muted-foreground">Loading profile...</p>
            ) : !user ? (
              <p className="text-muted-foreground">Sign in to manage your profile.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 bg-secondary border border-border rounded-lg p-6">
                <div>
                  <label htmlFor="profile-name" className="block text-sm font-medium text-foreground mb-2">Full name</label>
                  <input
                    id="profile-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoComplete="name"
                    maxLength={255}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="profile-email" className="block text-sm font-medium text-foreground mb-2">Email address</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoComplete="email"
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Supabase may ask you to confirm an email change before it takes effect.</p>
                </div>

                {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
                {message && <p role="status" className="text-sm text-green-500">{message}</p>}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving || !fullName.trim() || !email.trim()}
                    className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    disabled={saving}
                    className="px-6 py-2 bg-background border border-border text-foreground rounded-md hover:bg-muted text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
