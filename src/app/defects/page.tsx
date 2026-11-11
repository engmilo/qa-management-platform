'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Search, Plus } from 'lucide-react';

type Defect = {
  id: string;
  defect_key: string;
  summary: string;
  status: string;
  severity: string;
  priority: string;
  project_id: string;
  assigned_to: string | null;
  created_at: string;
  projects?: { name: string; key: string } | null;
  assigned_to_name?: string | null;
  assignee_name?: string | null;
  assigned_user?: { full_name?: string | null; name?: string | null } | null;
  profiles?: { full_name?: string | null; name?: string | null } | null;
};

type Project = { id: string; name: string; key: string };

const STATUS_META: Record<string, { label: string; badge: string }> = {
  open: { label: 'Open', badge: 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]' },
  in_progress: { label: 'In Progress', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
  fixed: { label: 'Fixed', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  resolved: { label: 'Resolved', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  closed: { label: 'Closed', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  rejected: { label: 'Rejected', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const SEVERITY_META: Record<string, { label: string; badge: string }> = {
  critical: { label: 'Critical', badge: 'bg-red-100 text-red-700 border-red-200' },
  major: { label: 'Major', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  minor: { label: 'Minor', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  trivial: { label: 'Trivial', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  high: { label: 'High', badge: 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]' },
  medium: { label: 'Medium', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
  low: { label: 'Low', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [dRes, pRes] = await Promise.all([
          fetch('/api/defects', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
        ]);
        const dData = await dRes.json();
        const pData = await pRes.json();
        if (!dRes.ok) throw new Error(dData.error || 'Could not load defects.');
        setDefects(dData.defects ?? []);
        setProjects(pData.projects ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load defects.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const assigneeName = (d: Defect) => {
    if (!d.assigned_to) return 'Unassigned';
    return d.assigned_to_name || d.assignee_name || d.assigned_user?.full_name || d.assigned_user?.name || d.profiles?.full_name || d.profiles?.name || 'Assigned';
  };

  const filtered = useMemo(() => defects.filter((d) => {
    if (projectFilter !== 'all' && d.project_id !== projectFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
    if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!d.summary.toLowerCase().includes(q) && !d.defect_key.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [defects, projectFilter, statusFilter, severityFilter, priorityFilter, search]);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Defects</h1>
                <p className="text-xs text-slate-500 mt-0.5">Track and manage defects.</p>
              </div>
              <Link href="/defects/new" className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> New Defect</Link>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search defects..." className="pl-8 pr-3 py-1.5 border rounded text-xs w-64" />
                </div>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="fixed">Fixed</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Severity</option>
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="trivial">Trivial</option>
                </select>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading defects...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">No defects found.</div>
            ) : (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Key</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Summary</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Severity</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Priority</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((d) => {
                        const s = STATUS_META[d.status] || { label: d.status, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                        const sev = SEVERITY_META[d.severity] || { label: d.severity, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                        const pri = PRIORITY_META[d.priority] || { label: d.priority, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                        return (
                          <tr key={d.id} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1a2636]">
                            <td className="px-4 py-3"><Link href={`/defects/${d.id}`} className="text-xs font-semibold text-[#276fbf] hover:underline">{d.defect_key}</Link></td>
                            <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-200 max-w- truncate">{d.summary}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border ${s.badge}`}>{s.label}</span></td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border ${sev.badge}`}>{sev.label}</span></td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border ${pri.badge}`}>{pri.label}</span></td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{assigneeName(d)}</td>
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