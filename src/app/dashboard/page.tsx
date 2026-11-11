'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { FileText, PlayCircle, Bug, CheckCircle2 } from 'lucide-react';

type Stats = {
  totalCases: number;
  totalRuns: number;
  openDefects: number;
  passRate: number | null;
  completedRuns: number;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  time: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalCases: 0, totalRuns: 0, openDefects: 0, passRate: null, completedRuns: 0 });
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [cRes, rRes, dRes] = await Promise.all([
          fetch('/api/test-cases', { cache: 'no-store' }),
          fetch('/api/test-runs', { cache: 'no-store' }),
          fetch('/api/defects', { cache: 'no-store' }),
        ]);
        const cData = await cRes.json();
        const rData = await rRes.json();
        const dData = await dRes.json();
        const cases = cData.testCases ?? cData.cases ?? [];
        const runs = rData.testRuns ?? rData.runs ?? [];
        const defects = dData.defects ?? [];
        const completed = runs.filter((r: any) => r.status === 'completed').length;
        const openDefects = defects.filter((d: any) => ['open', 'in_progress'].includes(d.status)).length;
        // Pass rate from runs stats if available, else null
        let passRate: number | null = null;
        if (runs.length > 0 && runs[0]?.stats?.passRate != null) passRate = runs[0].stats.passRate;
        setStats({ totalCases: cases.length, totalRuns: runs.length, openDefects, passRate, completedRuns: completed });
        const recent: Activity[] = [
          ...runs.slice(0, 3).map((r: any) => ({ id: r.id, type: 'Test Run', title: r.name, time: r.started_at })),
          ...defects.slice(0, 3).map((d: any) => ({ id: d.id, type: 'Defect', title: `${d.defect_key} — ${d.summary}`, time: d.created_at })),
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
        setActivity(recent);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load dashboard.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const cards = [
    { label: 'Test Cases', value: stats.totalCases, icon: FileText, link: '/test-cases', badge: 'bg-[#eef5fc] text-[#276fbf] border-[#d2e3f5]' },
    { label: 'Test Runs', value: stats.totalRuns, icon: PlayCircle, link: '/test-runs', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
    { label: 'Open Defects', value: stats.openDefects, icon: Bug, link: '/defects', badge: 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]' },
    { label: 'Pass Rate', value: stats.passRate == null ? '—' : `${stats.passRate}%`, icon: CheckCircle2, link: '/test-runs', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  ];

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-5">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5">Overview of your testing activity.</p>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading dashboard...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  {cards.map((c) => {
                    const Icon = c.icon;
                    return (
                      <Link key={c.label} href={c.link} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 hover:bg-slate-50 dark:hover:bg-[#1a2636]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold uppercase text-slate-400">{c.label}</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${c.badge}`}><Icon className="w-3.5 h-3.5" /></span>
                        </div>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">{c.value}</p>
                      </Link>
                    );
                  })}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Quick Links</h2>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/test-cases/new" className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded">New Test Case</Link>
                      <Link href="/test-runs/new" className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3 py-1.5 rounded">New Test Run</Link>
                      <Link href="/defects/new" className="bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 border border-[#d8dee4] dark:border-[#28374d] text-xs font-semibold px-3 py-1.5 rounded">New Defect</Link>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">{stats.completedRuns} of {stats.totalRuns} runs completed.</p>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border mt-2"><div className="h-full bg-[#48a43f]" style={{ width: `${stats.totalRuns === 0 ? 0 : Math.round((stats.completedRuns / stats.totalRuns) * 100)}%` }} /></div>
                  </div>

                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Recent Activity</h2>
                    {activity.length === 0 ? (
                      <p className="text-xs text-slate-500">No recent activity.</p>
                    ) : (
                      <div className="space-y-2">
                        {activity.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 border border-[#edf2f7] dark:border-[#222e3e] rounded p-2.5">
                            <span className="px-2 py-1 rounded text-xs font-semibold border bg-white text-slate-600 border-[#d8dee4]">{a.type}</span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white flex-1 truncate">{a.title}</span>
                            <span className="text- text-slate-400">{a.time ? new Date(a.time).toLocaleDateString() : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}