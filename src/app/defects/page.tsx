'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, Bug, Search, X } from 'lucide-react';

type Defect = { id: string; defect_key: string; summary: string; project_id: string; severity: string; priority: string; status: string };
type Project = { id: string; name: string; key: string };

const PAGE_SIZE = 20;

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([fetch('/api/defects', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([dRes, pRes]) => {
        const [dData, pData] = await Promise.all([dRes.json(), pRes.json()]);
        if (!dRes.ok) throw new Error(dData.error || 'Could not load defects.');
        if (!pRes.ok) throw new Error(pData.error || 'Could not load projects.');
        setDefects(dData.defects ?? []);
        const list = (pData.projects as Project[]) ?? [];
        setProjects(list);
        setProjectNames(Object.fromEntries(list.map((p) => [p.id, p.name])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load defects.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return defects.filter((d) => {
      if (q && !`${d.defect_key} ${d.summary}`.toLowerCase().includes(q)) return false;
      if (projectFilter && d.project_id !== projectFilter) return false;
      if (severityFilter && d.severity?.toLowerCase() !== severityFilter) return false;
      if (priorityFilter && d.priority?.toLowerCase() !== priorityFilter) return false;
      if (statusFilter && d.status?.toLowerCase() !== statusFilter) return false;
      return true;
    });
  }, [defects, search, projectFilter, severityFilter, priorityFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearAll = () => {
    setSearch(''); setProjectFilter(''); setSeverityFilter(''); setPriorityFilter(''); setStatusFilter(''); setPage(1);
  };

  const hasFilter = search || projectFilter || severityFilter || priorityFilter || statusFilter;

  const getSeverityBadge = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'blocker': case 'critical': return 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]';
      case 'major': return 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]';
      case 'minor': return 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]';
      case 'trivial': default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'fixed': case 'closed': return 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]';
      case 'in_progress': return 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]';
      case 'open': case 'new': return 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]';
      case 'rejected': return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Defects</h1>
              <p className="text-xs text-slate-500 mt-0.5">Log, prioritize, and monitor defects discovered during test execution cycles</p>
            </div>
            <Link href="/defects/new" className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4 stroke-[2.5]" /><span>Add Defect</span>
            </Link>
          </div>

          {error && <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}

          <div className="bg-white dark:bg-[#182232] border rounded-md p-3 mb-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by key or summary, e.g. BUG-101 or login..." className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#48a43f]" />
              </div>
              {hasFilter && <button onClick={clearAll} className="inline-flex items-center gap-1 border rounded px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><X className="w-3.5 h-3.5" /> Clear</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.key} - {p.name}</option>)}
              </select>
              <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Severities</option>
                <option value="blocker">Blocker</option><option value="critical">Critical</option><option value="major">Major</option><option value="minor">Minor</option><option value="trivial">Trivial</option>
              </select>
              <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Priorities</option>
                <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Statuses</option>
                <option value="open">Open</option><option value="new">New</option><option value="in_progress">In Progress</option><option value="fixed">Fixed</option><option value="closed">Closed</option><option value="rejected">Rejected</option>
              </select>
              <span className="ml-auto text-xs text-slate-500 self-center">Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-{Math.min(filtered.length, safePage * PAGE_SIZE)} of {filtered.length} {filtered.length !== defects.length ? `(filtered from ${defects.length})` : ''}</span>
            </div>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-8 text-center text-xs text-slate-500">Loading defects...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center">
              <Bug className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold">No defects match</h3>
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
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider">Key</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider">Summary</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider">Project</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider">Severity</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                        <th className="px-4 py-3 text- font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf2f7]">
                      {paged.map((d) => (
                        <tr key={d.id} className="hover:bg-[#f8fafc]">
                          <td className="px-4 py-3 text-xs"><Link href={`/defects/${d.id}`} className="font-mono font-bold text-[#276fbf] bg-[#eef5fc] border border-[#d2e3f5] px-2 py-0.5 rounded hover:underline">{d.defect_key}</Link></td>
                          <td className="px-4 py-3 text-xs font-medium"><Link href={`/defects/${d.id}`} className="text-slate-900 dark:text-white hover:text-[#276fbf] dark:hover:text-[#4da3ff] hover:underline">{d.summary}</Link></td>
                          <td className="px-4 py-3 text-xs text-slate-500">{projectNames[d.project_id] || 'General'}</td>
                          <td className="px-4 py-3 text-xs"><span className={`inline-block text- font-semibold px-2 py-0.5 rounded-full capitalize border ${getSeverityBadge(d.severity)}`}>{d.severity}</span></td>
                          <td className="px-4 py-3 text-xs capitalize">{d.priority}</td>
                          <td className="px-4 py-3 text-xs"><span className={`inline-block text- font-semibold px-2 py-0.5 rounded-full capitalize border ${getStatusBadge(d.status)}`}>{d.status?.replace('_', ' ')}</span></td>
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