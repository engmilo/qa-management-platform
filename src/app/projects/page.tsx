"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/projects', { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        setProjects(j.projects ?? j ?? []);
      } catch { setProjects([]); } finally { setLoading(false); }
    })();
  }, []);

  const filtered = projects.filter((p) => {
    if (search && !`${p.key ?? ''} ${p.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && (p.status ?? '') !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex flex-wrap gap-2 items-start justify-between">
              <div>
                <h1 className="text-xs font-semibold text-slate-900 dark:text-white">Projects</h1>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Manage your test projects.</p>
              </div>
              <Link href="/projects/new" className="text-xs font-normal bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5">+ New Project</Link>
            </div>
            <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-3 mt-4">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..." className="text-xs font-normal bg-white dark:bg-[#101622] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5 w-56" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5">
                <option value="">All Status</option><option value="active">Active</option><option value="archived">Archived</option>
              </select>
            </div>
            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md overflow-hidden mt-4">
              <table className="w-full text-xs font-semibold">
                <thead><tr className="bg-slate-50 dark:bg-[#1a2639] text-left text-slate-500 dark:text-slate-400"><th className="px-4 py-2.5">Key</th><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Description</th><th className="px-4 py-2.5">Status</th></tr></thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-t border-slate-200 dark:border-slate-700/50 align-top">
                      <td className="px-4 py-3">
                        {/* FIX: Key now matches Test Cases — text-sm font-bold, was text-xs */}
                        <Link href={`/projects/${p.id}`} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">{p.key}</Link>
                      </td>
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.description}</td>
                      <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal text-xs">{p.status ?? 'Active'}</span></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No projects found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}