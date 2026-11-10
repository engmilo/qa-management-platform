'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import Link from 'next/link';
import { FolderKanban, Plus, Search, X } from 'lucide-react';

type Project = { id: string; key: string; name: string; description: string | null; status: string };

const PAGE_SIZE = 12;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setProjects(data.projects || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !`${p.key} ${p.name} ${p.description ?? ''}`.toLowerCase().includes(q)) return false;
      if (statusFilter && (p.status ?? '').toLowerCase().trim() !== statusFilter) return false;
      return true;
    });
  }, [projects, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearAll = () => { setSearch(''); setStatusFilter(''); setPage(1); };
  const hasFilter = search || statusFilter;

  const selectCls = "border border-[#d8dee4] dark:border-[#28374d] rounded px-2.5 py-2 text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48a43f]";

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Projects</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage all your testing projects, milestone suites, and repositories
              </p>
            </div>
            <Link
              href="/projects/new"
              className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors inline-flex items-center gap-1.5 focus:outline-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Project</span>
            </Link>
          </div>

          {/* Search / Filter — same pattern as other lists */}
          <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-3 mb-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by key, name or description, e.g. ZAM..." className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#48a43f]" />
              </div>
              {hasFilter && <button onClick={clearAll} className="inline-flex items-center gap-1 border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200 bg-white dark:bg-[#182232] hover:bg-slate-50 dark:hover:bg-[#202c3e]"><X className="w-3.5 h-3.5" /> Clear</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 self-center">Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-{Math.min(filtered.length, safePage * PAGE_SIZE)} of {filtered.length} {filtered.length !== projects.length ? `(filtered from ${projects.length})` : ''}</span>
            </div>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Loading projects...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center shadow-sm">
              <FolderKanban className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{hasFilter ? 'No projects match' : 'No projects found'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {hasFilter ? 'Try a different search or clear the filters.' : 'Get started by creating your first testing project to store requirements and test cases.'}
              </p>
              {hasFilter ? (
                <button onClick={clearAll} className="mt-4 border border-[#d8dee4] dark:border-[#28374d] rounded px-3.5 py-2 text-xs font-semibold bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100">Clear all filters</button>
              ) : (
                <Link
                  href="/projects/new"
                  className="mt-4 inline-flex items-center gap-1.5 bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Create your first project
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paged.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5 shadow-sm hover:shadow hover:border-[#b0c4de] dark:hover:border-[#3a4e6b] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#276fbf] dark:text-[#4da3ff] bg-[#eef5fc] dark:bg-[#172739] border border-[#d2e3f5] dark:border-[#233f5d] px-2 py-0.5 rounded">
                            {project.key}
                          </span>
                          <span
                            className={`text- font-semibold px-2 py-0.5 rounded-full capitalize ${
                              project.status === 'active'
                                ? 'bg-[#dff0d8] dark:bg-[#132c1c] text-[#3c763d] dark:text-[#52c41a] border border-[#d6e9c6] dark:border-[#1d4c2b]'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {project.status}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                        {project.name}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                        {project.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#edf2f7] dark:border-[#222e3e] flex items-center justify-between">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:text-[#1d5ea8] dark:hover:text-[#7bb7ff] hover:underline inline-flex items-center gap-1"
                      >
                        View Project Details →
                      </Link>
                    </div>
                  </div>
                ))}
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