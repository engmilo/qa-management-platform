'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

type OrganizationMembership = { organization: { name: string } | null };

export function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/organizations')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !data) return;
        const memberships = (data.organizations ?? []) as OrganizationMembership[];
        setOrganizationName(memberships.find((item) => item.organization)?.organization?.name || '');
      })
      .catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError('');
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSignOutError(error.message);
        return;
      }
      router.replace('/auth/login');
      router.refresh();
    } catch {
      setSignOutError('Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const initials = (user?.user_metadata?.full_name || user?.email || 'QA')
    .trim()
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0].toUpperCase())
    .join('');

  return (
    <header className="h-16 bg-secondary border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">Dashboard Overview</h1>
      </div>

      <div className="flex items-center gap-4">
        {organizationName ? (
          <div className="text-sm text-muted-foreground">{organizationName}</div>
        ) : (
          <Link href="/organizations/new" className="text-sm text-muted-foreground hover:text-foreground">
            Create organization
          </Link>
        )}
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
        >
          New Project
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => { setMenuOpen((open) => !open); setSignOutError(''); }}
            className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {initials || 'QA'}
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-11 z-50 w-64 rounded-md border border-border bg-secondary p-2 shadow-lg">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-foreground">{user?.user_metadata?.full_name || 'Account'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block rounded px-3 py-2 text-sm text-foreground hover:bg-background"
              >
                My Profile
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full text-left rounded px-3 py-2 text-sm text-foreground hover:bg-background disabled:opacity-50"
              >
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
              {signOutError && <p role="alert" className="px-3 py-2 text-xs text-red-500">{signOutError}</p>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
