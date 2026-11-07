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
    {
      label: 'Total Projects',
      value: data?.stats.projectCount.toString() ?? (loading ? '…' : '—'),
      icon: FolderKanban,
      accent: 'border-t-4 border-[#276fbf]',
      iconColor: 'text-[#276fbf]',
      href: '/projects',
    },
    {
      label: 'Total Requirements',
      value: data?.stats.requirementCount.toString() ?? (loading ? '…' : '—'),
      icon: FileText,
      accent: 'border-t-4 border-indigo-500',
      iconColor: 'text-indigo-600',
      href: '/requirements',
    },
    {
      label: 'Test Cases',
      value: data?.stats.testCaseCount.toString() ?? (loading ? '…' : '—'),
      icon: CheckSquare,
      accent: 'border-t-4 border-[#48a43f]',
      iconColor: 'text-[#48a43f]',
      href: '/test-cases',
    },
    {
      label: 'Pass Rate',
      value: data?.stats.passRate == null ? '—' : `${data.stats.passRate}%`,
      icon: TrendingUp,
      accent: 'border-t-4 border-emerald-500',
      iconColor: 'text-emerald-600',
      href: '/test-runs',
    },
    {
      label: 'Open Defects',
      value: data?.stats.openDefectCount.toString() ?? (loading ? '…' : '—'),
      icon: AlertTriangle,
      accent: 'border-t-4 border-amber-500',
      iconColor: 'text-amber-600',
      href: '/defects',
    },
    {
      label: 'Critical Defects',
      value: data?.stats.criticalDefectCount.toString() ?? (loading ? '…' : '—'),
      icon: AlertOctagon,
      accent: 'border-t-4 border-red-500',
      iconColor: 'text-red-600',
      href: '/defects',
    },
  ];

  return (
    <div className="flex h-screen bg-[#f5f7f9]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* TestRail Welcome Sub-header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#e2e8f0]">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Welcome back, {displayName}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Here&apos;s what&apos;s happening across your testing suites and test runs today.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/test-runs/new"
                className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3 py-1.5 rounded shadow-sm transition-colors"
              >
                + Start Test Run
              </Link>
            </div>
          </div>

          {error && (
            <div role="alert" className="mb-5 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md font-medium">
              {error}
            </div>
          )}

          {/* TestRail Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className={`bg-white rounded-md border border-[#d8dee4] p-4 shadow-sm hover:shadow transition-all ${stat.accent} flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
                    <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">{stat.value}</p>
                </Link>
              );
            })}
          </div>

          {/* TestRail Two Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Execution Progress */}
            <section className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden flex flex-col">
              <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Test Execution Progress</h3>
                <Link href="/test-runs" className="text-xs font-semibold text-[#276fbf] hover:underline">
                  View all runs →
                </Link>
              </div>

              <div className="p-4 flex-1">
                {!data?.executionProgress.length ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-400">No active test runs recorded.</p>
                    <Link
                      href="/test-runs/new"
                      className="mt-3 inline-block text-xs font-semibold text-[#276fbf] hover:underline"
                    >
                      + Create a test run
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.executionProgress.map((run) => (
                      <div key={run.id} className="p-2.5 rounded hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between text-xs mb-1.5 gap-4">
                          <span className="font-medium text-slate-800 truncate">{run.name}</span>
                          <span className="font-semibold text-slate-700 shrink-0">
                            {run.progress == null ? '0%' : `${run.progress}%`}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="h-full bg-[#48a43f] rounded-full transition-all"
                            style={{ width: `${run.progress ?? 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Recent Defects */}
            <section className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden flex flex-col">
              <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Defects</h3>
                <Link href="/defects" className="text-xs font-semibold text-[#276fbf] hover:underline">
                  View defect tracker →
                </Link>
              </div>

              <div className="p-4 flex-1">
                {!data?.recentDefects.length ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-400">No defects reported.</p>
                    <Link
                      href="/defects/new"
                      className="mt-3 inline-block text-xs font-semibold text-[#276fbf] hover:underline"
                    >
                      + Log a new defect
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {data.recentDefects.map((defect) => {
                      const severity = defect.severity.charAt(0).toUpperCase() + defect.severity.slice(1);
                      const severityClass = ['critical', 'blocker'].includes(defect.severity)
                        ? 'bg-[#f2dede] text-[#a94442] border border-[#ebccd1]'
                        : defect.severity === 'major'
                        ? 'bg-[#fcf8e3] text-[#8a6d3b] border border-[#faebcc]'
                        : 'bg-slate-100 text-slate-700 border border-slate-200';
                      return (
                        <div
                          key={defect.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded border border-[#edf2f7] hover:bg-slate-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-bold text-[#276fbf] hover:underline cursor-pointer">
                              {defect.defect_key}
                            </span>
                            <p className="text-xs text-slate-700 truncate mt-0.5">{defect.summary}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${severityClass}`}>
                            {severity}
                          </span>
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
