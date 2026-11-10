'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Building2, Plus, ChevronDown, User, LogOut, Moon, Sun } from 'lucide-react';

function getTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard Overview';
  if (pathname.startsWith('/projects')) return 'Projects';
  if (pathname.startsWith('/milestones')) return 'Milestones';
  if (pathname.startsWith('/requirements')) return 'Requirements';
  if (pathname.startsWith('/test-plans')) return 'Test Plans';
  if (pathname.startsWith('/test-suites')) return 'Test Suites';
  if (pathname.startsWith('/test-cases')) return 'Test Cases';
  if (pathname.startsWith('/test-runs')) return 'Test Runs & Results';
  if (pathname.startsWith('/defects')) return 'Defects';
  if (pathname.startsWith('/traceability')) return 'Traceability';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/ai-assistant')) return 'AI Assistant';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/profile')) return 'My Profile';
  return 'Dashboard Overview';
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [dark, setDark] = useState(false);
  const [initials, setInitials] = useState('MH');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('Milo Haireche');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const isDark = saved ? saved === 'dark' : document.documentElement.classList.contains('dark');
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? '');
      const name = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Milo Haireche');
      setFullName(name);
      const parts = name.trim().split(/\s+/);
      setInitials(((parts[0]?.[0] || 'M') + (parts[1]?.[0] || 'H')).toUpperCase());
    });
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setOpen(false);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    } catch {
      window.location.href = '/auth/login';
    }
  };

  const goToProfile = () => {
    setOpen(false);
    window.location.href = '/profile';
  };

  return (
    // FIX: theme-aware, like sidebar brand bar.
    // Light: white header + dark text. Dark: dark navy header + white text.
    // Before it was always bg-[#141d28], so it stayed black in light mode.
    <header className="h-14 bg-white dark:bg-[#141d28] border-b border-[#d8dee4] dark:border-[#222e3e] flex items-center justify-between gap-3 px-4 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#48a43f] shrink-0" />
        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{getTitle(pathname)}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link href="/settings"
          className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded bg-slate-100 dark:bg-[#1e2a3a] hover:bg-slate-200 dark:hover:bg-[#28374d] border border-[#e2e8f0] dark:border-[#28374d] text-xs font-medium text-slate-700 dark:text-slate-200">
          <Building2 className="w-3.5 h-3.5" /> Zamir Oy
        </Link>

        <Link href="/projects/new"
          className="flex items-center gap-1 h-8 px-3 rounded bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> New Project
        </Link>

        <button type="button" onClick={toggleTheme} aria-label="Toggle theme"
          className="w-8 h-8 rounded flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e2a3a]">
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div ref={menuRef} className="relative ml-1">
          <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 hover:opacity-90">
            <span className="w-8 h-8 rounded-full bg-[#276fbf] text-white text-xs font-bold flex items-center justify-center">{initials}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[#e2e8f0] dark:border-[#28374d]">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{fullName}</p>
                {email && <p className="text- text-slate-500 dark:text-slate-400 truncate">{email}</p>}
              </div>
              <button type="button" onClick={goToProfile}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-left">
                <User className="w-3.5 h-3.5" /> My Profile
              </button>
              <button type="button" onClick={() => void handleSignOut()} disabled={signingOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 text-left">
                <LogOut className="w-3.5 h-3.5" /> {signingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}