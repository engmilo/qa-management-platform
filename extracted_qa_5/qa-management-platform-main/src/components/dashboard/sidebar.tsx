'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderKanban, Flag, FileText,
  Calendar, Layers, CheckSquare,
  PlayCircle, Bug, GitFork,
  BarChart3, Sparkles, Settings, ShieldCheck,
} from 'lucide-react';

const groups = [
  { label: 'Overview', items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }] },
  { label: 'Workspace', items: [
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Milestones', href: '/milestones', icon: Flag },
    { name: 'Requirements', href: '/requirements', icon: FileText },
  ]},
  { label: 'Test Design', items: [
    { name: 'Test Plans', href: '/test-plans', icon: Calendar },
    { name: 'Test Suites', href: '/test-suites', icon: Layers },
    { name: 'Test Cases', href: '/test-cases', icon: CheckSquare },
  ]},
  { label: 'Execution', items: [
    { name: 'Test Runs & Results', href: '/test-runs', icon: PlayCircle },
    { name: 'Defects', href: '/defects', icon: Bug },
    { name: 'Traceability', href: '/traceability', icon: GitFork },
  ]},
  { label: 'Insights', items: [
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'AI Assistant', href: '/ai-assistant', icon: Sparkles },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-white dark:bg-[#141d28] border-r border-[#d8dee4] dark:border-[#222e3e] h-screen flex flex-col justify-between shrink-0 select-none">
      <div className="overflow-y-auto">
        <div className="h-14 bg-white dark:bg-[#141d28] border-b border-[#d8dee4] dark:border-[#222e3e] px-4 flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded bg-[#48a43f] flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">QA Management Platform</span>
        </div>

        {groups.map((group) => (
          <div key={group.label} className="px-2 pt-4">
            <p className="px-3 pb-1.5 text- font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link href={item.href}
                      style={{ fontWeight: 400 }}
                      className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors font-normal ${
                        isActive
                          ? 'bg-[#edf5fd] dark:bg-[#172739] text-[#276fbf] dark:text-[#4da3ff]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`}>
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#276fbf] dark:text-[#4da3ff]' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-[#edf2f7] dark:border-[#222e3e] bg-slate-50/60 dark:bg-[#111720]">
        <div className="flex items-center justify-between text- text-slate-500 dark:text-slate-400 font-medium px-1">
          <span>Test Management</span>
          <span className="text- bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">v2.4</span>
        </div>
      </div>
    </aside>
  );
}