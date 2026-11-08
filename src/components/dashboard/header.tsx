'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Plus, Building2, User, LogOut, CheckCircle2 } from 'lucide-react';

type OrganizationMembership = { organization: { name: string } | null };
type OrganizationLoadState = 'loading' | 'available' | 'empty' | 'error';

export function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [organizationLoadState, setOrganizationLoadState] = useState<OrganizationLoadState>('loading');
  const [organizationRetry, setOrganizationRetry] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    let active = true;
    setOrganizationName('');
    setOrganizationLoadState('loading');

    if (!user?.id) {
      return () => { active = false; };
    }

    fetch('/api/organizations', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load organizations');
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        if (!Array.isArray(data.organizations)) throw new Error('Organization response was invalid');
        const memberships = (data.organizations ?? []) as OrganizationMembership[];
        const name = memberships.find((item) => item.organization?.name)?.organization?.name || '';
        setOrganizationName(name);
        setOrganizationLoadState(name ? 'available' : 'empty');
      })
      .catch(() => {
        if (active) setOrganizationLoadState('error');
      });
    return () => { active = false; };
  }, [user?.id, organizationRetry]);

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
      setMenuOpen(false);
      router.replace('/auth/login');
      router.refresh();
    } catch {
      setSignOutError('Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '';
  const initials = displayName
    ? displayName
        .split(' ')
        .map((part: string) => part[0])
        .filter(Boolean)
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'JD';

  return (
    <header className="h-14 bg-[#1d2d3e] text-white px-5 flex items-center justify-between border-b border-[#141f2b] shadow-sm shrink-0 z-20">
      {/* Left section: TestRail Section Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide">
          <span className="inline-block w-2 h-2 rounded-full bg-[#48a43f]"></span>
          <span className="text-white font-medium">Dashboard Overview</span>
        </div>
      </div>

      {/* Right section: Org Badge, Theme Toggle, CTA, User Menu */}
      <div className="flex items-center gap-3">
        {organizationLoadState === 'available' ? (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-[#2b3d51] px-3 py-1.5 rounded border border-[#384e66]">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{organizationName}</span>
          </div>
        ) : organizationLoadState === 'empty' ? (
          <Link
            href="/organizations/new"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-[#2b3d51] hover:bg-[#344961] px-3 py-1.5 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#48a43f]" />
            Create organization
          </Link>
        ) : organizationLoadState === 'error' ? (
          <button
            type="button"
            onClick={() => setOrganizationRetry((retry) => retry + 1)}
            className="text-xs text-amber-300 hover:text-amber-200 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded"
            title="Retry loading your organization"
          >
            Organization unavailable · Retry
          </button>
        ) : null}

        {/* TestRail Signature Green "New Project" Button */}
        <Link
          href="/projects/new"
          className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3 py-1.5 rounded shadow-sm transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#48a43f] focus:ring-offset-1 focus:ring-offset-[#1d2d3e]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Project</span>
        </Link>

        {/* Dark / Light Mode Switcher */}
        <ThemeToggle />

        {/* User Avatar & TestRail Style Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setMenuOpen((open) => !open); setSignOutError(''); }}
            className="w-8 h-8 rounded-full bg-[#276fbf] hover:ring-2 hover:ring-[#48a43f] flex items-center justify-center text-white text-xs font-bold transition-all shadow-sm focus:outline-none"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {initials || 'QA'}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-10 z-50 w-64 rounded-md border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#182232] p-1.5 shadow-xl text-slate-800 dark:text-slate-200"
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-[#28374d] mb-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{user?.user_metadata?.full_name || 'QA Engineer'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-semibold bg-[#e8f5e9] dark:bg-[#132c1c] text-[#2e7d32] dark:text-[#52c41a] border border-[#c8e6c9] dark:border-[#1d4c2b] px-2 py-0.5 rounded-full">
                  Organization Member
                </span>
              </div>
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#202c3e] hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                My Profile
              </Link>
              <div className="border-t border-slate-100 dark:border-[#28374d] my-1"></div>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2 text-left rounded px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
              {signOutError && <p role="alert" className="px-3 py-1.5 text-xs text-red-600 font-medium">{signOutError}</p>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
