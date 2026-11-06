'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Projects', href: '/projects' },
  { name: 'Requirements', href: '/requirements' },
  { name: 'Test Plans', href: '/test-plans' },
  { name: 'Test Cases', href: '/test-cases' },
  { name: 'Test Execution', href: '/test-runs' },
  { name: 'Defects', href: '/defects' },
  { name: 'Traceability', href: '/traceability' },
  { name: 'Reports', href: '/reports' },
  { name: 'AI Assistant', href: '/ai-assistant' },
  { name: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-secondary border-r border-border h-screen overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold text-foreground">QA Platform</h2>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`block px-4 py-2 rounded-md text-sm ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
