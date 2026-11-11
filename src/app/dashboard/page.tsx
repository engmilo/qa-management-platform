'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type Dash = { testCases: number; testRuns: number; completedRuns: number; openDefects: number; passed: number; failed: number; passRate: number | null };

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // FIX: no-store — always fresh after you change a result, never cached —
        const res = await fetch('/api/dashboard', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        setD({ testCases: data.testCases ?? 0, testRuns: data.testRuns ?? 0, completedRuns: data.completedRuns ?? 0, openDefects: data.openDefects ?? 0, passed: data.passed ?? 0, failed: data.failed ?? 0, passRate: data.passRate ?? null });
      } catch { setD({ testCases: 0, testRuns: 0, completedRuns: 0, openDefects: 0, passed: 0, failed: 0, passRate: null }); }
      finally { setLoading(false); }
    })();
  }, []);

  const passLabel = d?.passRate === null || d?.passRate === undefined ? '—' : `${d.passRate}%`;
  const runPct = d && d.testRuns ? Math.round((d.completedRuns / d.testRuns) * 100) : 0;

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <h1 className="text-xs font-semibold text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 mb-5">Overview of your testing activity.</p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4"><p className="text-xs font-semibold text-slate-500">TEST CASES</p><p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">{loading ? '—' : d?.testCases}</p></div>
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4"><p className="text-xs font-semibold text-slate-500">TEST RUNS</p><p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">{loading ? '—' : d?.testRuns}</p></div>
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4"><p className="text-xs font-semibold text-slate-500">OPEN DEFECTS</p><p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">{loading ? '—' : d?.openDefects}</p></div>
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4"><p className="text-xs font-semibold text-slate-500">PASS RATE</p><p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">{loading ? '—' : passLabel}</p>{!loading && d?.passRate !== null && <p className="text-xs font-semibold text-slate-500 mt-0.5">{d?.passed} passed · {d?.failed} failed</p>}</div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">Quick Links</h2>
                <div className="flex flex-wrap gap-2">
                  <Link href="/test-cases/new" className="bg-[#276fbf] text-white text-xs font-semibold px-3 py-1.5 rounded">New Test Case</Link>
                  <Link href="/test-runs/new" className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded">New Test Run</Link>
                  <Link href="/defects/new" className="bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded">New Defect</Link>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-3">{d ? `${d.completedRuns} of ${d.testRuns} runs completed.` : ''}</p>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2"><div className="h-full bg-green-500" style={{ width: `${runPct}%` }} /></div>
              </div>
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">Recent Activity</h2>
                <p className="text-xs font-semibold text-slate-500">See Test Runs, Defects, and Test Cases for full lists. Pass Rate now updates live from executions.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}