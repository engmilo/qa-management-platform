'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { useAuth } from '@/components/auth/AuthProvider';

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
    { label: 'Total Projects', value: data?.stats.projectCount.toString() ?? (loading ? '…' : '—') },
    { label: 'Total Requirements', value: data?.stats.requirementCount.toString() ?? (loading ? '…' : '—') },
    { label: 'Test Cases', value: data?.stats.testCaseCount.toString() ?? (loading ? '…' : '—') },
    { label: 'Pass Rate', value: data?.stats.passRate == null ? '—' : `${data.stats.passRate}%` },
    { label: 'Open Defects', value: data?.stats.openDefectCount.toString() ?? (loading ? '…' : '—') },
    { label: 'Critical Defects', value: data?.stats.criticalDefectCount.toString() ?? (loading ? '…' : '—') },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back, {displayName}</h2>
            <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your QA projects today.</p>
          </div>

          {error && <p role="alert" className="mb-5 text-sm text-red-500">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-secondary border border-border rounded-lg p-6">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-secondary border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Test Execution Progress</h3>
              {!data?.executionProgress.length ? (
                <p className="text-sm text-muted-foreground">No test runs yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.executionProgress.map((run) => (
                    <div key={run.id}>
                      <div className="flex justify-between text-sm mb-2 gap-4">
                        <span className="text-muted-foreground truncate">{run.name}</span>
                        <span className="text-foreground shrink-0">{run.progress == null ? '—' : `${run.progress}%`}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${run.progress ?? 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-secondary border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Defects</h3>
              {!data?.recentDefects.length ? (
                <p className="text-sm text-muted-foreground">No defects reported yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentDefects.map((defect) => {
                    const severity = defect.severity.charAt(0).toUpperCase() + defect.severity.slice(1);
                    const severityClass = ['critical', 'blocker'].includes(defect.severity)
                      ? 'bg-red-500/20 text-red-400'
                      : defect.severity === 'major'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-yellow-500/20 text-yellow-400';
                    return (
                      <div key={defect.id} className="flex items-center justify-between gap-4 p-3 bg-muted rounded-md">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{defect.defect_key}</p>
                          <p className="text-xs text-muted-foreground truncate">{defect.summary}</p>
                        </div>
                        <span className={`shrink-0 text-xs px-2 py-1 rounded ${severityClass}`}>{severity}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
