'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Search, Plus } from 'lucide-react';

type Milestone = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  due_date: string | null;
  project_id: string;
  projects?: { name: string; key: string } | null;
};

type Project = { id: string; name: string; key: string };

const STATUS_META: Record<string, { label: string; badge: string }> = {
  planned: { label: 'Planned', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  in_progress: { label: 'In Progress', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
  completed: { label: 'Completed', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  delayed: { label: 'Delayed', badge: 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]' },
  cancelled: { label: 'Cancelled', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  active: { label: 'Active', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
};

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
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
        const [mRes, pRes] = await Promise.all([
          fetch('/api/milestones', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
        ]);
        const mData = await mRes.json();
        const pData = await pRes.json();
        if (!mRes.ok) throw new Error(mData.error || 'Could not load milestones.');
        setMilestones(mData.milestones ?? []);
        setProjects(pData.projects ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load milestones.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => milestones.filter((m) => {
    if (projectFilter !== 'all' && m.project_id !== projectFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !(m.description ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [milestones, projectFilter, statusFilter, search]);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Milestones</h1>
                <p className="text-xs text-slate-500 mt-0.5">Track project milestones and deadlines.</p>
              </div>
              <Link href="/milestones/new" className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> New Milestone</Link>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search milestones..." className="pl-8 pr-3 py-1.5 border rounded text-xs w-64 max-w-full" />
                </div>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Status</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading milestones...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">No milestones found.</div>
            ) : (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <table className="w-full table-fixed text-left">
                  <colgroup><col className="w-[28%]" /><col className="w-[32%]" /><col className="w-[16%]" /><col className="w-[12%]" /><col className="w-[12%]" /></colgroup>
                  <thead>
                    <tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Name</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Description</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Project</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Due Date</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => {
                      const s = STATUS_META[m.status] || { label: m.status, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                      return (
                        <tr key={m.id} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1a2636] align-top">
                          <td className="px-4 py-3 break-words whitespace-normal"><Link href={`/milestones/${m.id}`} className="text-xs font-semibold text-[#276fbf] hover:underline break-words">{m.name}</Link></td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal">{m.description || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal">{m.projects ? `${m.projects.key} — ${m.projects.name}` : '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{m.due_date ? new Date(m.due_date).toLocaleDateString() : '—'}</td>
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