'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Search, Plus } from 'lucide-react';

type TestRun = {
  id: string;
  name: string;
  status: string;
  project_id: string;
  assigned_to: string | null;
  description: string | null;
  configuration: string | null;
  started_at: string;
  completed_at: string | null;
  projects?: { name: string; key: string } | null;
  assigned_to_name?: string | null;
  assignee_name?: string | null;
  assigned_user?: { full_name?: string | null; name?: string | null; email?: string | null } | null;
  profiles?: { full_name?: string | null; name?: string | null; email?: string | null } | null;
  stats?: { total: number; completed: number; passed: number; progress: number } | null;
};

type Project = { id: string; name: string; key: string };

const STATUS_META: Record<string, { label: string; badge: string }> = {
  in_progress: { label: 'In Progress', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
  completed: { label: 'Completed', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  not_started: { label: 'Not Started', badge: 'bg-slate-50 text-slate-500 border-slate-200' },
  blocked: { label: 'Blocked', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  failed: { label: 'Failed', badge: 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]' },
  passed: { label: 'Passed', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
};

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [rRes, pRes] = await Promise.all([
          fetch('/api/test-runs', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
        ]);
        const rData = await rRes.json();
        const pData = await pRes.json();
        if (!rRes.ok) throw new Error(rData.error || 'Could not load test runs.');
        setRuns(rData.testRuns ?? rData.runs ?? []);
        setProjects(pData.projects ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load test runs.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const assigneeName = (r: TestRun) => {
    if (!r.assigned_to) return 'Unassigned';
    return r.assigned_to_name || r.assignee_name || r.assigned_user?.full_name || r.assigned_user?.name || r.profiles?.full_name || r.profiles?.name || 'Assigned';
  };

  const assigneeOptions = useMemo(() => {
    const names = new Map<string, string>();
    runs.forEach((r) => {
      if (r.assigned_to) names.set(r.assigned_to, assigneeName(r));
    });
    return Array.from(names.entries()).map(([id, name]) => ({ id, name }));
  }, [runs]);

  const filtered = useMemo(() => runs.filter((r) => {
    if (projectFilter !== 'all' && r.project_id !== projectFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (assigneeFilter === 'assigned' && !r.assigned_to) return false;
    if (assigneeFilter === 'unassigned' && r.assigned_to) return false;
    if (assigneeFilter !== 'all' && assigneeFilter !== 'assigned' && assigneeFilter !== 'unassigned' && r.assigned_to !== assigneeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !(r.projects?.name ?? '').toLowerCase().includes(q) && !(r.projects?.key ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [runs, projectFilter, statusFilter, assigneeFilter, search]);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Test Runs &amp; Results</h1>
                <p className="text-xs text-slate-500 mt-0.5">Execute test plans and track results.</p>
              </div>
              <Link href="/test-runs/new" className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> New Run</Link>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search runs..." className="pl-8 pr-3 py-1.5 border rounded text-xs w-64" />
                </div>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Status</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="not_started">Not Started</option>
                </select>
                <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Assignees</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                  {assigneeOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading test runs...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">No test runs found.</div>
            ) : (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Name</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Project</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Assignee</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => {
                        const meta = STATUS_META[r.status] || { label: r.status, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                        const progress = r.stats?.progress ?? 0;
                        return (
                          <tr key={r.id} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1a2636]">
                            <td className="px-4 py-3">
                              <Link href={`/test-runs/${r.id}`} className="text-xs font-semibold text-[#276fbf] hover:underline">{r.name}</Link>
                              {r.configuration && <p className="text- text-slate-400 mt-0.5">{r.configuration}</p>}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{r.projects?.key} — {r.projects?.name}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border ${meta.badge}`}>{meta.label}</span></td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{assigneeName(r)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden border"><div className="h-full bg-[#48a43f]" style={{ width: `${progress}%` }} /></div>
                                <span className="text-xs font-semibold">{progress}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}