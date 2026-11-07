'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { useAuth } from '@/components/auth/AuthProvider';
import { User, Mail, Shield, Check, AlertCircle } from 'lucide-react';

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
    <div className="flex h-screen bg-[#f5f7f9]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-[#6e7d8c] mb-1">
              <span>Administration</span>
              <span>/</span>
              <span className="text-[#1d2d3e] font-medium">My Profile</span>
            </div>

            <div className="mb-5">
              <h1 className="text-xl font-bold text-[#1d2d3e] flex items-center gap-2">
                <User className="w-5 h-5 text-[#276fbf]" />
                User Profile
              </h1>
              <p className="text-xs text-[#6e7d8c] mt-0.5">
                Manage your personal information, credentials, and notification email
              </p>
            </div>

            {authLoading ? (
              <div className="bg-white border border-[#d8dee4] rounded-lg p-6 text-xs text-[#6e7d8c]">
                Loading profile information...
              </div>
            ) : !user ? (
              <div className="bg-white border border-[#d8dee4] rounded-lg p-6 text-xs text-[#6e7d8c]">
                Please sign in to manage your profile.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-[#d8dee4] rounded-lg shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-4 pb-4 border-b border-[#e5e9ec]">
                  <div className="w-14 h-14 rounded-full bg-[#1d2d3e] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {fullName ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'JD'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1d2d3e]">{fullName || 'User'}</h3>
                    <p className="text-xs text-[#6e7d8c]">{email}</p>
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#276fbf] border border-blue-200">
                      <Shield className="w-3 h-3" />
                      Active Member
                    </span>
                  </div>
                </div>

                {message && (
                  <div className="p-3 rounded bg-green-50 border border-green-200 text-[#3d8c36] text-xs font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{message}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="profile-name" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition"
                    autoComplete="name"
                    maxLength={255}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="profile-email" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full px-3 py-2 pl-9 bg-white border border-[#d8dee4] rounded text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition"
                      autoComplete="email"
                      required
                    />
                    <Mail className="w-4 h-4 text-[#95a5a6] absolute left-3 top-2.5" />
                  </div>
                  <p className="text-[11px] text-[#6e7d8c] mt-1">
                    Changing your email address requires confirmation via a verification link sent to the new address.
                  </p>
                </div>

                <div className="pt-2 border-t border-[#e5e9ec] flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-[#48a43f] hover:bg-[#3d8c36] text-white text-xs font-semibold rounded shadow-sm transition disabled:opacity-50"
                  >
                    {saving ? 'Saving changes...' : 'Save Profile Changes'}
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
