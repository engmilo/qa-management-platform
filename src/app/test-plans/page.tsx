'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, Calendar, Search, X } from 'lucide-react';

type TestPlan = { id: string; title: string; project_id: string; scope: string | null; status: string; start_date: string | null; end_date: string | null };
type Project = { id: string; name: string; key: string };

const PAGE_SIZE = 12;

export default function TestPlansPage() {
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([fetch('/api/test-plans', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([pRes, prRes]) => {
        const [pData, prData] = await Promise.all([pRes.json(), prRes.json()]);
        if (!pRes.ok) throw new Error(pData.error || 'Could not load test plans.');
        if (!prRes.ok) throw new Error(prData.error || 'Could not load projects.');
        setPlans(pData.testPlans ?? []);
        const list = (prData.projects as Project[]) ?? [];
        setProjects(list);
        setProjectNames(Object.fromEntries(list.map((p) => [p.id, p.name])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load test plans.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plans.filter((p) => {
      if (q && !`${p.title} ${p.scope ?? ''}`.toLowerCase().includes(q)) return false;
      if (projectFilter && p.project_id !== projectFilter) return false;
      if (statusFilter && p.status?.toLowerCase() !== statusFilter) return false;
      return true;
    });
  }, [plans, search, projectFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearAll = () => { setSearch(''); setProjectFilter(''); setStatusFilter(''); setPage(1); };
  const hasFilter = search || projectFilter || statusFilter;

 const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase().trim()) {
    case 'completed': return 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]';
    case 'active': return 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]';
    case 'in_progress': return 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]';
    case 'draft': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'planning': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'archived': return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
    default: return 'bg-amber-50 text-amber-700 border-amber-200';
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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Test Plans</h1>
              <p className="text-xs text-slate-500 mt-0.5">Organize releases, milestones, test suites, and schedule testing cycles</p>
            </div>
            <Link href="/test-plans/new" className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4 stroke-[2.5]" /><span>Add Test Plan</span>
            </Link>
          </div>

          {error && <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}

          <div className="bg-white dark:bg-[#182232] border rounded-md p-3 mb-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by title or scope, e.g. Smoke Test..." className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#48a43f]" />
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
  <option value="active">Active</option><option value="draft">Draft</option><option value="planning">Planning</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="archived">Archived</option>
</select>
              <span className="ml-auto text-xs text-slate-500 self-center">Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-{Math.min(filtered.length, safePage * PAGE_SIZE)} of {filtered.length} {filtered.length !== plans.length ? `(filtered from ${plans.length})` : ''}</span>
            </div>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-8 text-center text-xs text-slate-500">Loading test plans...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold">No test plans match</h3>
              <p className="text-xs text-slate-500 mt-1">Try a different search or clear the filters.</p>
              {hasFilter && <button onClick={clearAll} className="mt-4 border rounded px-3.5 py-2 text-xs font-semibold">Clear all filters</button>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {paged.map((plan) => (
                  <section key={plan.id} className="bg-white dark:bg-[#182232] border rounded-md p-5 shadow-sm hover:shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h2 className="text-base font-bold text-slate-900 dark:text-white"><Link href={`/test-plans/${plan.id}`} className="hover:underline">{plan.title}</Link></h2>
                          <p className="text-xs font-medium text-[#276fbf] mt-0.5">{projectNames[plan.project_id] || 'General Project'}</p>
                        </div>
                        <span className={`text- font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 border ${getStatusBadge(plan.status)}`}>{plan.status.replace('_', ' ')}</span>
                      </div>
                      {plan.scope && <p className="mt-3 text-xs text-slate-600 leading-relaxed bg-[#f8fafc] p-2.5 rounded border break-words whitespace-normal">{plan.scope}</p>}
                    </div>
                    <div className="mt-4 pt-3 border-t flex items-center justify-between text- text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{plan.start_date || 'No start date'}{plan.end_date ? ` - ${plan.end_date}` : ''}</span>
                      <Link href={`/test-plans/${plan.id}`} className="text-[#276fbf] hover:underline font-semibold">Open →</Link>
                    </div>
                  </section>
                ))}
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