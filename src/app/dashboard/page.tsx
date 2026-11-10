'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { useAuth } from '@/components/auth/AuthProvider';
import { FolderKanban, FileText, CheckSquare, TrendingUp, AlertTriangle, AlertOctagon } from 'lucide-react';
import Link from 'next/link';

type DashboardData = {
  stats: {
    projectCount: number;
    requirementCount: number;
    testCaseCount: number;
    passRate: number | null;
    openDefectCount: number;
    criticalDefectCount: number;
  };
  executionProgress: { id: string; name: string; progress: number | null; total: number }[];
  recentDefects: { id: string; defect_key: string; summary: string; severity: string; status: string }[];
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load dashboard data.');
      setData(result as DashboardData);
      setError('');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    const refresh = () => { if (document.visibilityState === 'visible') void loadDashboard(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadDashboard]);

  const displayName = String(
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'there'
  ).trim().split(/\s+/)[0];

  const stats = [
    { label: 'Total Projects', value: data?.stats.projectCount.toString() ?? (loading ? '' : ''), icon: FolderKanban, accent: 'border-t-4 !border-t-[#276fbf] dark:!border-t-[#4da3ff]', iconColor: 'text-[#276fbf] dark:text-[#4da3ff]', href: '/projects' },
    { label: 'Total Requirements', value: data?.stats.requirementCount.toString() ?? (loading ? '' : ''), icon: FileText, accent: 'border-t-4 !border-t-indigo-500 dark:!border-t-indigo-400', iconColor: 'text-indigo-600 dark:text-indigo-400', href: '/requirements' },
    { label: 'Test Cases', value: data?.stats.testCaseCount.toString() ?? (loading ? '' : ''), icon: CheckSquare, accent: 'border-t-4 !border-t-[#48a43f] dark:!border-t-[#52c41a]', iconColor: 'text-[#48a43f]', href: '/test-cases' },
    { label: 'Pass Rate', value: data?.stats.passRate == null ? '' : `${data.stats.passRate}%`, icon: TrendingUp, accent: 'border-t-4 !border-t-emerald-500 dark:!border-t-emerald-400', iconColor: 'text-emerald-600 dark:text-emerald-400', href: '/test-runs' },
    { label: 'Open Defects', value: data?.stats.openDefectCount.toString() ?? (loading ? '' : ''), icon: AlertTriangle, accent: 'border-t-4 !border-t-amber-500 dark:!border-t-amber-400', iconColor: 'text-amber-600 dark:text-amber-400', href: '/defects' },
    { label: 'Critical Defects', value: data?.stats.criticalDefectCount.toString() ?? (loading ? '' : ''), icon: AlertOctagon, accent: 'border-t-4 !border-t-red-500 dark:!border-t-red-400', iconColor: 'text-red-600 dark:text-red-400', href: '/defects' },
  ];

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e2e8f0] dark:border-[#222e3e]">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">Welcome back, {displayName}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Here&apos;s what&apos;s happening across your testing suites and test runs today.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/test-runs/new" className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3 py-1.5 rounded shadow-sm transition-colors">
                + Start Test Run
              </Link>
            </div>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-md font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link key={stat.label} href={stat.href} className={`bg-white dark:bg-[#182232] rounded-md border border-[#d8dee4] dark:border-[#28374d] p-3 shadow-sm hover:shadow transition-all ${stat.accent} flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <p className="text- font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                  </div>
                  <p className="text-xl font-semibold text-slate-900 dark:text-white mt-1.5 tracking-tight">{stat.value}</p>
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden flex flex-col">
              <div className="bg-[#f8fafc] dark:bg-[#141d28] px-3 py-2.5 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Test Execution Progress</h3>
                <Link href="/test-runs" className="text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:underline">View all runs →</Link>
              </div>
              <div className="p-3 flex-1">
                {!data?.executionProgress.length ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-slate-400 dark:text-slate-500">No active test runs recorded.</p>
                    <Link href="/test-runs/new" className="mt-3 inline-block text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:underline">+ Create a test run</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.executionProgress.map((run) => (
                      <div key={run.id} className="p-2 rounded hover:bg-slate-50 dark:hover:bg-[#1f2c3f] transition-colors">
                        <div className="flex justify-between text-xs mb-1.5 gap-4">
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{run.name}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">{run.progress == null ? '0%' : `${run.progress}%`}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                          <div className="h-full bg-[#48a43f] rounded-full transition-all" style={{ width: `${run.progress ?? 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden flex flex-col">
              <div className="bg-[#f8fafc] dark:bg-[#141d28] px-3 py-2.5 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Recent Defects</h3>
                <Link href="/defects" className="text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:underline">View defect tracker →</Link>
              </div>
              <div className="p-3 flex-1">
                {!data?.recentDefects.length ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-slate-400 dark:text-slate-500">No defects reported.</p>
                    <Link href="/defects/new" className="mt-3 inline-block text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:underline">+ Log a new defect</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recentDefects.map((defect) => {
                      const severity = defect.severity.charAt(0).toUpperCase() + defect.severity.slice(1);
                      const severityClass = ['critical', 'blocker'].includes(defect.severity)
                        ? 'bg-[#f2dede] dark:bg-[#34161a] text-[#a94442] dark:text-[#ff7875] border border-[#ebccd1] dark:border-[#521e24]'
                        : defect.severity === 'major'
                        ? 'bg-[#fcf8e3] dark:bg-[#332711] text-[#8a6d3b] dark:text-[#faad14] border border-[#faebcc] dark:border-[#534019]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
                      return (
                        <div key={defect.id} className="flex items-center justify-between gap-3 p-2 rounded border border-[#edf2f7] dark:border-[#222e3e] hover:bg-slate-50 dark:hover:bg-[#1f2c3f] transition-colors">
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-bold text-[#276fbf] dark:text-[#4da3ff] hover:underline cursor-pointer">{defect.defect_key}</span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 truncate mt-0.5">{defect.summary}</p>
                          </div>
                          <span className={`shrink-0 text- font-semibold px-2 py-0.5 rounded-full ${severityClass}`}>{severity}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}