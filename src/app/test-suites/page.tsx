'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, Layers, Search, X } from 'lucide-react';

type Suite = { id: string; name: string; description: string | null; project_id: string; test_plan_id: string | null; caseCount: number };
type Project = { id: string; name: string; key: string };
type Plan = { id: string; title: string };

const PAGE_SIZE = 20;

export default function TestSuitesPage() {
  const [suites, setSuites] = useState<Suite[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [planNames, setPlanNames] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([fetch('/api/test-suites', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' }), fetch('/api/test-plans', { cache: 'no-store' })])
      .then(async ([sRes, pRes, plRes]) => {
        const [sData, pData, plData] = await Promise.all([sRes.json(), pRes.json(), plRes.json()]);
        if (!sRes.ok) throw new Error(sData.error || 'Could not load suites.');
        setSuites(sData.testSuites ?? []);
        const plist = (pData.projects as Project[]) ?? [];
        setProjects(plist);
        setProjectNames(Object.fromEntries(plist.map((p) => [p.id, `${p.key} - ${p.name}`])));
        const pllist = (plData.testPlans as Plan[]) ?? [];
        setPlans(pllist);
        setPlanNames(Object.fromEntries(pllist.map((p) => [p.id, p.title])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load suites.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suites.filter((s) => {
      if (q && !`${s.name} ${s.description ?? ''}`.toLowerCase().includes(q)) return false;
      if (projectFilter && s.project_id !== projectFilter) return false;
      if (planFilter === 'standalone' && s.test_plan_id) return false;
      if (planFilter && planFilter !== 'standalone' && s.test_plan_id !== planFilter) return false;
      return true;
    });
  }, [suites, search, projectFilter, planFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearAll = () => { setSearch(''); setProjectFilter(''); setPlanFilter(''); setPage(1); };
  const hasFilter = search || projectFilter || planFilter;

  const selectCls = "border border-[#d8dee4] dark:border-[#28374d] rounded px-2.5 py-2 text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48a43f]";

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Test Suites</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Group test cases into suites, optionally inside a test plan</p>
            </div>
            <Link href="/test-suites/new" className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4 stroke-[2.5]" /><span>Add Test Suite</span>
            </Link>
          </div>

          {error && <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}

          <div className="bg-white dark:bg-[#182232] border rounded-md p-3 mb-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by suite name or description..." className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#48a43f]" />
              </div>
              {hasFilter && <button onClick={clearAll} className="inline-flex items-center gap-1 border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200 bg-white dark:bg-[#182232] hover:bg-slate-50 dark:hover:bg-[#202c3e]"><X className="w-3.5 h-3.5" /> Clear</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.key} - {p.name}</option>)}
              </select>
              <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Test Plans</option>
                <option value="standalone">Standalone — no plan</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 self-center">Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-{Math.min(filtered.length, safePage * PAGE_SIZE)} of {filtered.length} {filtered.length !== suites.length ? `(filtered from ${suites.length})` : ''}</span>
            </div>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-[#182232] border rounded-md p-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading suites...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-[#182232] border rounded-md p-10 text-center">
              <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No suites match</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try a different search or clear the filters.</p>
              {hasFilter && <button onClick={clearAll} className="mt-4 border border-[#d8dee4] dark:border-[#28374d] rounded px-3.5 py-2 text-xs font-semibold bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100">Clear all filters</button>}
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-[#182232] border rounded-md shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w- text-left">
                    <thead className="bg-[#f8fafc] dark:bg-[#141d28] border-b">
                      <tr>
                        <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Test Plan</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cases</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf2f7] dark:divide-[#222e3e]">
                      {paged.map((s) => (
                        <tr key={s.id} className="hover:bg-[#f8fafc] dark:hover:bg-[#1f2c3f]">
                          <td className="px-4 py-3 text-xs">
                            <Link href={`/test-suites/${s.id}`} className="font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:underline">{s.name}</Link>
                            {s.description && <p className="text-slate-500 dark:text-slate-400 mt-0.5 break-words whitespace-normal leading-relaxed max-w-">{s.description}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{projectNames[s.project_id] || 'General'}</td>
                          <td className="px-4 py-3 text-xs">{s.test_plan_id ? <Link href={`/test-plans/${s.test_plan_id}`} className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">{planNames[s.test_plan_id] || 'View plan'}</Link> : <span className="text-slate-400 dark:text-slate-500">Standalone</span>}</td>
                          <td className="px-4 py-3 text-xs text-slate-800 dark:text-slate-100">{s.caseCount}</td>
                          <td className="px-4 py-3 text-xs"><Link href={`/test-suites/${s.id}`} className="text-[#276fbf] dark:text-[#4da3ff] hover:underline font-semibold">Open →</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">Page {safePage} of {totalPages}</p>
                <div className="flex gap-2">
                  <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-40 bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100">← Prev</button>
                  <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-40 bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100">Next →</button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}