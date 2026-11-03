'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function OrganizationSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  
  const organizations: Organization[] = [
    { id: '1', name: 'Acme QA Labs', slug: 'acme-qa', role: 'org_admin' },
    { id: '2', name: 'Beta Testing Co', slug: 'beta-testing', role: 'qa_manager' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded-md text-foreground hover:bg-muted"
      >
        <span>Acme QA Labs</span>
        <span className="text-xs text-muted-foreground">▼</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-secondary border border-border rounded-md shadow-lg z-50">
          <div className="p-2">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/organizations/${org.id}`}
                className="block px-4 py-2 rounded hover:bg-muted"
                onClick={() => setIsOpen(false)}
              >
                <div className="text-sm font-medium text-foreground">{org.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{org.role.replace('_', ' ')}</div>
              </Link>
            ))}
            <hr className="my-2 border-border" />
            <Link
              href="/organizations/new"
              className="block px-4 py-2 rounded hover:bg-muted text-sm text-primary"
              onClick={() => setIsOpen(false)}
            >
              + Create New Organization
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
