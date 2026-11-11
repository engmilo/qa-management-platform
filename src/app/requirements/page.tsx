'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Search, Plus, FileText } from 'lucide-react';

type Requirement = {
  id: string;
  req_key: string;
  title: string;
  project_id: string;
  type: string;
  priority: string;
  status: string;
};

type Project = { id: string; name: string; key: string };

const STATUS_META: Record<string, { label: string; badge: string }> = {
  draft: { label: 'Draft', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  under_review: { label: 'Under Review', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
  approved: { label: 'Approved', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  implemented: { label: 'Implemented', badge: 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]' },
  verified: { label: 'Verified', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  rejected: { label: 'Rejected', badge: 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]' },
};

const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  low: { label: 'Low', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  high: { label: 'High', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
  critical: { label: 'Critical', badge: 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]' },
};

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [rRes, pRes] = await Promise.all([
          fetch('/api/requirements', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
        ]);
        const rText = await rRes.text();
        const pText = await pRes.text();
        const rData = rText ? JSON.parse(rText) : {};
        const pData = pText ? JSON.parse(pText) : {};
        if (!rRes.ok) throw new Error(rData.error || 'Could not load requirements.');
        setRequirements(rData.requirements ?? []);
        setProjects(pData.projects ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load requirements.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const projectNames = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, `${p.key} — ${p.name}`])), [projects]);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    requirements.forEach((r) => { if (r.type) s.add(r.type); });
    return Array.from(s).sort();
  }, [requirements]);

  const filtered = useMemo(() => requirements.filter((r) => {
    if (projectFilter !== 'all' && r.project_id !== projectFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !r.req_key.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [requirements, projectFilter, statusFilter, priorityFilter, typeFilter, search]);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Requirements</h1>
                <p className="text-xs text-slate-500 mt-0.5">Define and track functional, security, and performance specifications.</p>
              </div>
              <Link href="/requirements/new" className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Requirement</Link>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search key or title..." className="pl-8 pr-3 py-1.5 border rounded text-xs w-64 max-w-full" />
                </div>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="implemented">Implemented</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Types</option>
                  {typeOptions.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading requirements...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center shadow-sm">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No requirements found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">Add requirements to link them directly to test cases and track test coverage.</p>
                <Link href="/requirements/new" className="mt-4 inline-flex items-center gap-1.5 bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3 py-1.5 rounded">Add your first requirement</Link>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <table className="w-full table-fixed text-left">
                  <colgroup><col className="w-[12%]" /><col className="w-[30%]" /><col className="w-[18%]" /><col className="w-[14%]" /><col className="w-[12%]" /><col className="w-[14%]" /></colgroup>
                  <thead>
                    <tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Key</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Title</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Project</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Type</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Priority</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const s = STATUS_META[item.status] || { label: item.status, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                      const pr = PRIORITY_META[item.priority] || { label: item.priority, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                      return (
                        <tr key={item.id} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1a2636] align-top">
                          <td className="px-4 py-3 break-words"><Link href={`/requirements/${item.id}`} className="font-mono text-xs font-bold text-[#276fbf] hover:underline break-all">{item.req_key}</Link></td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white break-words whitespace-normal"><Link href={`/requirements/${item.id}`} className="hover:underline">{item.title}</Link></td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal">{projectNames[item.project_id] || 'General'}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal capitalize">{item.type.replace('_', ' ')}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border whitespace-nowrap ${pr.badge}`}>{pr.label}</span></td>
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