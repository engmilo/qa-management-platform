'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="h-16 bg-secondary border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">Dashboard Overview</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">Acme QA Labs</div>
        <button className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90">
          New Project
        </button>
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
          JD
        </div>
      </div>
    </header>
  );
}
