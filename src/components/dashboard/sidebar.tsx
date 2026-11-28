"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Flag,
  FileText,
  ClipboardList,
  Layers,
  ListChecks,
  PlayCircle,
  Bug,
  GitBranch,
  BarChart3,
  Sparkles,
  Settings,
} from 'lucide-react';

const groups = [
  {
    label: 'OVERVIEW',
    items: [{ href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard }],
  },
  {
    label: 'WORKSPACE',
    items: [
      { href: '/projects', label: 'Projects', Icon: FolderKanban },
      { href: '/milestones', label: 'Milestones', Icon: Flag },
      { href: '/requirements', label: 'Requirements', Icon: FileText },
    ],
  },
  {
    label: 'TEST DESIGN',
    items: [
      { href: '/test-plans', label: 'Test Plans', Icon: ClipboardList },
      { href: '/test-suites', label: 'Test Suites', Icon: Layers },
      { href: '/test-cases', label: 'Test Cases', Icon: ListChecks },
    ],
  },
  {
    label: 'EXECUTION',
    items: [
      { href: '/test-runs', label: 'Test Runs & Results', Icon: PlayCircle },
      { href: '/defects', label: 'Defects', Icon: Bug },
      { href: '/traceability', label: 'Traceability', Icon: GitBranch },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { href: '/reports', label: 'Reports', Icon: BarChart3 },
      { href: '/ai-assistant', label: 'AI Assistant', Icon: Sparkles },
      { href: '/settings', label: 'Settings', Icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 h-screen flex flex-col bg-[#0B1220] border-r border-[#1E293B] overflow-hidden">
      {/* Logo - unchanged */}
      <div className="h-12 shrink-0 flex items-center gap-2 px-4 border-b border-[#1E293B]">
        <div className="w-7 h-7 rounded-md bg-[#22c55e] flex items-center justify-center text-white text-[13px] font-bold">✓</div>
        <span className="text-[13px] font-bold text-white tracking-tight">QA Management Platform</span>
      </div>

      {/* Nav - fits at 100% zoom, NO scrollbar, NO scrolling needed */}
      <nav className="flex-1 overflow-hidden flex flex-col px-3 py-2 gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => (
          <div key={g.label} className="shrink-0">
            <p className="text-[11px] font-bold tracking-wider text-slate-500 px-2 mb-1">{g.label}</p>
            <div className="flex flex-col">
              {g.items.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname?.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`h-8 flex items-center gap-2.5 px-2 rounded-lg text-[13px] font-normal ${
                      active
                        ? 'bg-[#1E293B] text-blue-400'
                        : 'text-slate-300 hover:bg-[#1E293B] hover:text-white'
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.8} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer - unchanged */}
      <div className="shrink-0 px-4 py-2.5 border-t border-[#1E293B] flex items-center justify-between">
        <span className="text-[13px] font-normal text-slate-400">Test Management</span>
        <span className="text-[11px] font-normal text-slate-400 bg-[#1E293B] px-1.5 py-0.5 rounded">v2.4</span>
      </div>
    </aside>
  );
}
