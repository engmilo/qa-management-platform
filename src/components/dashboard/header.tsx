'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-secondary border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">Dashboard Overview</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">Acme QA Labs</div>
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
        >
          New Project
        </Link>
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user?.email?.substring(0, 2).toUpperCase() || 'JD'}
        </div>
      </div>
    </header>
  );
}
