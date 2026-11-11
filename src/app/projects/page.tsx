'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Search, Plus } from 'lucide-react';

type Project = {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: string | null;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; badge: string }> = {
  active: { label: 'Active', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  archived: { label: 'Archived', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  on_hold: { label: 'On Hold', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const res = await fetch('/api/projects', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load projects.');
        setProjects(data.projects ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load projects.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => projects.filter((p) => {
    if (statusFilter !== 'all' && (p.status ?? 'active') !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.key.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [projects, statusFilter, search]);

  const statusLabel = (s: string | null) => {
    if (!s) return 'Active';
    return STATUS_META[s]?.label ?? s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Projects</h1>
                <p className="text-xs text-slate-500 mt-0.5">Manage your test projects.</p>
              </div>
              <Link href="/projects/new" className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> New Project</Link>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..." className="pl-8 pr-3 py-1.5 border rounded text-xs w-64 max-w-full" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading projects...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">No projects found.</div>
            ) : (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-[12%]" />
                    <col className="w-[22%]" />
                    <col className="w-[46%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Key</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Name</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Description</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const st = STATUS_META[p.status ?? 'active'] || { label: statusLabel(p.status), badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                      return (
                        <tr key={p.id} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1a2636] align-top">
                          <td className="px-4 py-3 break-words"><Link href={`/projects/${p.id}`} className="font-mono text-xs font-bold text-[#276fbf] hover:underline break-all">{p.key}</Link></td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white break-words whitespace-normal">{p.name}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal">{p.description || '—'}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border whitespace-nowrap ${st.badge}`}>{st.label}</span></td>
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