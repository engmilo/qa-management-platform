"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type Row = {
  id: string;
  code: string;
  title: string;
  project: string;
  testCases: number;
  testCaseList: { code: string; title: string }[];
  defects: number;
  defectList: { key: string; summary: string }[];
  coverage: string;
};

export default function TraceabilityPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [covered, setCovered] = useState(0);
  const [total, setTotal] = useState(0);
  const [pct, setPct] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/traceability', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        setRows(data.rows ?? []);
        setCovered(data.covered ?? 0);
        setTotal(data.total ?? 0);
        setPct(data.coveragePct ?? 0);
      } catch { setRows([]); } finally { setLoading(false); }
    })();
  }, []);

  const filtered = rows.filter((r) =>
    `${r.code} ${r.title}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <h1 className="text-xs font-semibold text-slate-900 dark:text-white">Traceability</h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 mb-4">Requirements to Test Cases to Defects coverage. Link is read from test_case_requirements join table.</p>
            <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-3 mb-4">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requirements..." className="text-xs font-normal bg-white dark:bg-[#101622] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5 w-56" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{loading ? '—' : `${covered} of ${total} covered · ${pct}%`}</p>
            </div>
            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md overflow-hidden">
              <table className="w-full text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1a2639] text-left text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-2.5">Requirement</th>
                    <th className="px-4 py-2.5">Project</th>
                    <th className="px-4 py-2.5 text-center">Test Cases</th>
                    <th className="px-4 py-2.5 text-center">Defects</th>
                    <th className="px-4 py-2.5 text-center">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-slate-200 dark:border-slate-700/50 align-top">
                      <td className="px-4 py-3">
                        <Link href={`/requirements/${r.id}`} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                          {r.code} — {r.title}
                        </Link>
                        {r.testCaseList.length > 0 && (
                          <div className="mt-1 text-slate-500 dark:text-slate-400">
                            {r.testCaseList.map((c, i) => (<div key={i}><span className="text-sm font-bold text-blue-600 dark:text-blue-400">{c.code}</span> — {c.title}</div>))}
                          </div>
                        )}
                        {r.testCaseList.length === 0 && (
                          <div className="mt-1 text-slate-400">No test case linked yet. Edit a test case and tick Requirement = {r.code}.</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{r.project}</td>
                      <td className="px-4 py-3 text-center">{r.testCases}</td>
                      <td className="px-4 py-3 text-center">
                        {r.defects}
                        {r.defectList.length > 0 && (
                          <div className="text-slate-500 dark:text-slate-400 mt-1">
                            {r.defectList.map((d, i) => (<div key={i}><span className="text-sm font-bold text-blue-600 dark:text-blue-400">{d.key}</span> — {d.summary}</div>))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-normal ${r.coverage === 'Covered' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{r.coverage}</span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No requirements found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3">Coverage = Covered if at least 1 test case is linked via test_case_requirements. Defects = defects linked to that requirement, or to any of its linked test cases.</p>
          </div>
        </main>
      </div>
    </div>
  );
}