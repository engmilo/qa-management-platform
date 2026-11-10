'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, PlayCircle, Search, X } from 'lucide-react';

type TestRun = { id: string; name: string; project_id: string; test_plan_id: string | null; status: string; started_at: string };
type Project = { id: string; name: string; key: string };

const PAGE_SIZE = 20;

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([fetch('/api/test-runs', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([rRes, pRes]) => {
        const [rData, pData] = await Promise.all([rRes.json(), pRes.json()]);
        if (!rRes.ok) throw new Error(rData.error || 'Could not load test runs.');
        if (!pRes.ok) throw new Error(pData.error || 'Could not load projects.');
        setRuns(rData.testRuns ?? []);
        const list = (pData.projects as Project[]) ?? [];
        setProjects(list);
        setProjectNames(Object.fromEntries(list.map((p) => [p.id, p.name])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load test runs.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return runs.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (projectFilter && r.project_id !== projectFilter) return false;
      if (statusFilter && r.status?.toLowerCase().trim() !== statusFilter) return false;
      return true;
    });
  }, [runs, search, projectFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearAll = () => { setSearch(''); setProjectFilter(''); setStatusFilter(''); setPage(1); };
  const hasFilter = search || projectFilter || statusFilter;

  const getStatusBadge = (s: string) => {
    switch (s?.toLowerCase().trim()) {
      case 'completed': return 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]';
      case 'in_progress': return 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]';
      case 'not_started': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'paused': return 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]';
      case 'blocked': return 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]';
      case 'cancelled': return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const selectCls = "border border-[#d8dee4] dark:border-[#28374d] rounded px-2.5 py-2 text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48a43f]";

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Test Runs &amp; Results</h1>
              <p className="text-xs text-slate-500 mt-0.5">Execute test suites, record pass/fail results, and monitor execution milestones</p>
            </div>
            <Link href="/test-runs/new" className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4 stroke-[2.5]" /><span>Add Test Run</span>
            </Link>
          </div>

          {error && <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}

          <div className="bg-white dark:bg-[#182232] border rounded-md p-3 mb-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by run name..." className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#48a43f]" />
              </div>
              {hasFilter && <button onClick={clearAll} className="inline-flex items-center gap-1 border rounded px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><X className="w-3.5 h-3.5" /> Clear</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.key} - {p.name}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Statuses</option>
                <option value="not_started">Not Started</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="paused">Paused</option><option value="blocked">Blocked</option><option value="cancelled">Cancelled</option>
              </select>
              <span className="ml-auto text-xs text-slate-500 self-center">Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-{Math.min(filtered.length, safePage * PAGE_SIZE)} of {filtered.length} {filtered.length !== runs.length ? `(filtered from ${runs.length})` : ''}</span>
            </div>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-8 text-center text-xs text-slate-500">Loading test runs...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center">
              <PlayCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold">No test runs match</h3>
              <p className="text-xs text-slate-500 mt-1">Try a different search or clear the filters.</p>
              {hasFilter && <button onClick={clearAll} className="mt-4 border rounded px-3.5 py-2 text-xs font-semibold">Clear all filters</button>}
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-[#182232] border rounded-md shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w- text-left">
                    <thead className="bg-[#f8fafc] dark:bg-[#141d28] border-b">
                      <tr>
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider">Run Name</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider">Project</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider">Started</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf2f7]">
                      {paged.map((run) => (
                        <tr key={run.id} className="hover:bg-[#f8fafc]">
                          <td className="px-4 py-3 text-xs font-bold"><Link href={`/test-runs/${run.id}`} className="text-[#276fbf] hover:underline">{run.name}</Link></td>
                          <td className="px-4 py-3 text-xs text-slate-600">{projectNames[run.project_id] || 'General Project'}</td>
                          <td className="px-4 py-3 text-xs"><span className={`inline-block text- font-semibold px-2 py-0.5 rounded-full capitalize border ${getStatusBadge(run.status)}`}>{run.status?.replace('_', ' ')}</span></td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-mono">{run.started_at ? new Date(run.started_at).toLocaleString() : '-'}</td>
                          <td className="px-4 py-3 text-xs"><Link href={`/test-runs/${run.id}`} className="text-[#276fbf] hover:underline font-semibold">Open →</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500">Page {safePage} of {totalPages}</p>
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