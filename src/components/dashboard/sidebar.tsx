'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  CheckSquare,
  PlayCircle,
  Bug,
  GitFork,
  BarChart3,
  Sparkles,
  Settings,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Requirements', href: '/requirements', icon: FileText },
  { name: 'Test Plans', href: '/test-plans', icon: Calendar },
  { name: 'Test Cases', href: '/test-cases', icon: CheckSquare },
  { name: 'Test Execution', href: '/test-runs', icon: PlayCircle },
  { name: 'Defects', href: '/defects', icon: Bug },
  { name: 'Traceability', href: '/traceability', icon: GitFork },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Sparkles },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-white border-r border-[#d8dee4] h-screen flex flex-col justify-between shrink-0 shadow-[1px_0_3px_rgba(0,0,0,0.02)] select-none">
      <div>
        {/* Brand Bar */}
        <div className="h-14 bg-[#141f2b] px-3.5 flex items-center gap-2.5 border-b border-[#0f1721]">
          <div className="w-7 h-7 rounded bg-[#48a43f] flex items-center justify-center text-white shadow-sm shrink-0">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-bold text-white tracking-tight leading-snug">
              QA Management Platform
            </h2>
          </div>
        </div>

        {/* Section Heading */}
        <div className="px-4 pt-4 pb-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            QA Repository
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="px-2 pt-1 pb-4">
          <ul className="space-y-0.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded transition-colors group ${
                      isActive
                        ? 'bg-[#edf5fd] text-[#276fbf] border-l-2 border-[#276fbf] font-bold pl-[10px]'
                        : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#276fbf]' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Footer Metadata */}
      <div className="p-3 border-t border-[#edf2f7] bg-slate-50/60">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
          <span>Test Management</span>
          <span className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded font-mono">v2.4</span>
        </div>
      </div>
    </aside>
  );
}
