"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type Dash = {
  testCases: number;
  manual: number;
  automated: number;
  testRuns: number;
  completedRuns: number;
  inProgressRuns: number;
  openDefects: number;
  totalDefects: number;
  fixedDefects: number;
  criticalDefects: number;
  majorDefects: number;
  latestDefect: { key: string; title: string } | null;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  passRate: number | null;
  lastPassed: {
    runId: string | null;
    testCaseCode: string;
    testCaseTitle: string;
    runName: string;
  } | null;
  recent: { type: string; title: string; date: string }[];
};

function Donut({ value }: { value: number | null }) {
  const pct = value ?? 0;
  const r = 24;
  const C = 2 * Math.PI * r;
  const color =
    value === null ? '#475569' : value >= 80 ? '#22c55e' : value >= 50 ? '#eab308' : '#ef4444';
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#334155" strokeWidth="7" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-white">
          {value === null ? '—' : `${value}%`}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/dashboard', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        setD({
          testCases: data.testCases ?? 0,
          manual: data.manual ?? 0,
          automated: data.automated ?? 0,
          testRuns: data.testRuns ?? 0,
          completedRuns: data.completedRuns ?? 0,
          inProgressRuns: data.inProgressRuns ?? 0,
          openDefects: data.openDefects ?? 0,
          totalDefects: data.totalDefects ?? 0,
          fixedDefects: data.fixedDefects ?? 0,
          criticalDefects: data.criticalDefects ?? 0,
          majorDefects: data.majorDefects ?? 0,
          latestDefect: data.latestDefect ?? null,
          passed: data.passed ?? 0,
          failed: data.failed ?? 0,
          blocked: data.blocked ?? 0,
          notRun: data.notRun ?? 0,
          passRate: data.passRate ?? null,
          lastPassed: data.lastPassed ?? null,
          recent: data.recent ?? [],
        });
      } catch {
        setD(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runPct = d && d.testRuns ? Math.round((d.completedRuns / d.testRuns) * 100) : 0;
  const caseAutoPct = d && d.testCases ? Math.round((d.automated / d.testCases) * 100) : 0;

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <h1 className="text-xs font-semibold text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
              Overview of your testing activity.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div
                className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4 flex flex-col transition"
              >
                <p className="text-xs font-semibold text-slate-500 text-center">TEST CASES</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2 leading-none text-center">
                  {loading ? '—' : d?.testCases}
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-2 text-center">
                  {loading ? '' : `${d?.manual} manual · ${d?.automated} automated`}
                </p>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-blue-500" style={{ width: `${caseAutoPct}%` }} />
                </div>
                <Link href="/test-cases" className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-auto pt-3 inline-block hover:underline">Click to view →</Link>
              </div>

              <div
                className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4 flex flex-col transition"
              >
                <p className="text-xs font-semibold text-slate-500 text-center">TEST RUNS</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2 leading-none text-center">
                  {loading ? '—' : d?.testRuns}
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-2 text-center">
                  {loading ? '' : `${d?.completedRuns} completed · ${d?.inProgressRuns} in progress`}
                </p>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-green-500" style={{ width: `${runPct}%` }} />
                </div>
                <Link href="/test-runs" className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-auto pt-3 inline-block hover:underline">Click to view →</Link>
              </div>

              <div
                className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4 flex flex-col transition"
              >
                <p className="text-xs font-semibold text-slate-500 text-center">OPEN DEFECTS</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2 leading-none text-center">
                  {loading ? '—' : d?.openDefects}
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-2 text-center">
                  {loading ? '' : `${d?.openDefects} open of ${d?.totalDefects} total · ${d?.fixedDefects} fixed`}
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  {loading ? '' : `${d?.criticalDefects} Critical · ${d?.majorDefects} Major (total)`}
                </p>
                <p className="text-xs font-semibold text-slate-400 mt-2 truncate">
                  {d?.latestDefect
                    ? `Latest: ${d.latestDefect.key ? `${d.latestDefect.key} — ` : ''}${d.latestDefect.title}`
                    : 'No open defects'}
                </p>
                <Link href="/defects" className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-auto pt-3 inline-block hover:underline">Click to view →</Link>
              </div>

              <div
                className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4 flex flex-col transition"
              >
                <p className="text-xs font-semibold text-slate-500 text-center">PASS RATE</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2 leading-none text-center">
                  {loading ? '—' : d?.passRate === null ? '—' : `${d.passRate}%`}
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-2 text-center">
                  {loading ? '' : `${d?.passed} passed · ${d?.failed} failed`}
                </p>
                <p className="text-xs font-semibold text-slate-400 text-center">
                  {loading ? '' : `${d?.blocked} blocked · ${d?.notRun} not run`}
                </p>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-blue-500" style={{ width: `${d?.passRate ?? 0}%` }} />
                </div>
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-2 truncate">
                  {d?.lastPassed
                    ? `Passed: ${d.lastPassed.testCaseCode} — ${d.lastPassed.testCaseTitle}`
                    : 'No passed cases yet'}
                </p>
                <Link href={d?.lastPassed?.runId ? `/test-runs/${d.lastPassed.runId}` : '/test-runs'} className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-auto pt-3 inline-block hover:underline">Click to view →</Link>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">Quick Links</h2>
                <div className="flex flex-wrap gap-2">
                  <Link href="/test-cases/new" className="bg-[#276fbf] text-white text-xs font-semibold px-3 py-1.5 rounded">
                    New Test Case
                  </Link>
                  <Link href="/test-runs/new" className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded">
                    New Test Run
                  </Link>
                  <Link href="/defects/new" className="bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded">
                    New Defect
                  </Link>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-3">
                  {d ? `${d.completedRuns} of ${d.testRuns} runs completed.` : ''}
                </p>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-green-500" style={{ width: `${runPct}%` }} />
                </div>
              </div>
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">Recent Activity</h2>
                {d?.recent?.length ? (
                  d.recent.map((a, i) => (
                    <div
                      key={i}
                      className="flex justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                    >
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        <span className="text-slate-400 mr-1">{a.type}</span>
                        {a.title}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 shrink-0">
                        {a.date ? new Date(a.date).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-semibold text-slate-500">No recent activity yet.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
