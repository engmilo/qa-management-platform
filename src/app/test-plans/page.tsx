'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Search, Plus, FileText } from 'lucide-react';

type TestPlan = {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  scope?: string | null;
  status: string;
  project_id: string;
  start_date?: string | null;
  end_date?: string | null;
  projects?: { name: string; key: string } | null;
};

type Project = { id: string; name: string; key: string };

const STATUS_META: Record<string, { label: string; badge: string }> = {
  draft: { label: 'Draft', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  planning: { label: 'Planning', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
  active: { label: 'Active', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  in_progress: { label: 'In Progress', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
  completed: { label: 'Completed', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  archived: { label: 'Archived', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelled', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function TestPlansPage() {
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [tRes, pRes] = await Promise.all([
          fetch('/api/test-plans', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
        ]);
        const tText = await tRes.text();
        const pText = await pRes.text();
        const tData = tText ? JSON.parse(tText) : {};
        const pData = pText ? JSON.parse(pText) : {};
        if (!tRes.ok) throw new Error(tData.error || 'Could not load test plans.');
        setPlans(tData.testPlans ?? tData.plans ?? []);
        setProjects(pData.projects ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load test plans.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const projectNames = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, `${p.key} — ${p.name}`])), [projects]);

  const planName = (p: TestPlan) => p.title || p.name || 'Untitled';
  const planDesc = (p: TestPlan) => p.scope || p.description || '—';
  const planProject = (p: TestPlan) => {
    if (p.projects) return `${p.projects.key} — ${p.projects.name}`;
    return projectNames[p.project_id] || '—';
  };
  const statusKey = (s: string) => (s || '').toLowerCase();
  const statusLabel = (s: string) => STATUS_META[statusKey(s)]?.label ?? (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—');

  const filtered = useMemo(() => plans.filter((p) => {
    if (projectFilter !== 'all' && p.project_id !== projectFilter) return false;
    if (statusFilter !== 'all' && statusKey(p.status) !== statusKey(statusFilter)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!planName(p).toLowerCase().includes(q) && !(planDesc(p) ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [plans, projectFilter, statusFilter, search, projectNames]);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Test Plans</h1>
                <p className="text-xs text-slate-500 mt-0.5">Plan test scope, strategy, and schedule.</p>
              </div>
              <Link href="/test-plans/new" className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> New Test Plan</Link>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search test plans..." className="pl-8 pr-3 py-1.5 border rounded text-xs w-64 max-w-full" />
                </div>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading test plans...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center shadow-sm">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No test plans found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">Create a test plan to organize suites, cases, and runs.</p>
                <Link href="/test-plans/new" className="mt-4 inline-flex items-center gap-1.5 bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded">Create your first test plan</Link>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <table className="w-full table-fixed text-left">
                  <colgroup><col className="w-[28%]" /><col className="w-[34%]" /><col className="w-[20%]" /><col className="w-[18%]" /></colgroup>
                  <thead>
                    <tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Name</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Description</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Project</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const s = STATUS_META[statusKey(p.status)] || { label: statusLabel(p.status), badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                      return (
                        <tr key={p.id} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1a2636] align-top">
                          <td className="px-4 py-3 break-words whitespace-normal"><Link href={`/test-plans/${p.id}`} className="text-xs font-semibold text-[#276fbf] hover:underline break-words">{planName(p)}</Link></td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal">{planDesc(p)}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal">{planProject(p)}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border whitespace-nowrap ${s.badge}`}>{s.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}