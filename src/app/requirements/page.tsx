"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function RequirementsPage() {
  const [reqs, setReqs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [rRes, pRes] = await Promise.all([fetch('/api/requirements', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })]);
        const rJ = await rRes.json().catch(() => ({}));
        const pJ = await pRes.json().catch(() => ({}));
        setReqs(rJ.requirements ?? rJ ?? []);
        setProjects(pJ.projects ?? pJ ?? []);
      } catch { setReqs([]); } finally { setLoading(false); }
    })();
  }, []);

  const projName = (id: string) => {
    const p = projects.find((x: any) => String(x.id) === String(id));
    return p ? `${p.key} — ${p.name}` : '';
  };

  const filtered = reqs.filter((r) => {
    if (search && !`${r.req_key ?? ''} ${r.title}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (projectFilter && String(r.project_id) !== projectFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (priorityFilter && r.priority !== priorityFilter) return false;
    if (typeFilter && r.type !== typeFilter) return false;
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
                <h1 className="text-2xl font-bold text-white tracking-tight text-left m-0">Requirements</h1>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">Define and track functional, security, and performance specifications.</p>
              </div>
              <Link href="/requirements/new" className="text-xs font-normal bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5">+ Add Requirement</Link>
            </div>
            <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-3 mt-4">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search key or title..." className="text-xs font-normal bg-white dark:bg-[#101622] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5 w-56" />
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5"><option value="">All Projects</option>{projects.map((p: any) => (<option key={p.id} value={String(p.id)}>{p.name}</option>))}</select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5"><option value="">All Status</option><option value="draft">Draft</option><option value="under_review">Under Review</option><option value="approved">Approved</option><option value="implemented">Implemented</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5"><option value="">All Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5"><option value="">All Types</option><option value="functional">Functional</option><option value="non_functional">Non-functional</option><option value="business">Business</option><option value="performance">Performance</option><option value="security">Security</option><option value="technical">Technical</option><option value="user_story">User Story</option><option value="automation">Automation</option><option value="regression">Regression</option><option value="e2e">E2E</option></select>
            </div>
            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md overflow-hidden mt-4">
              <table className="w-full text-xs font-semibold">
                <thead><tr className="bg-slate-50 dark:bg-[#1a2639] text-left text-slate-500 dark:text-slate-400"><th className="px-4 py-2.5">Key</th><th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">Project</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Priority</th><th className="px-4 py-2.5">Status</th></tr></thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-slate-200 dark:border-slate-700/50">
                      <td className="px-4 py-3">
                        {/* FIX: Key now matches Test Cases — text-sm font-bold, was text-xs */}
                        <Link href={`/requirements/${r.id}`} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">{r.req_key}</Link>
                      </td>
                      <td className="px-4 py-3">{r.title}</td>
                      <td className="px-4 py-3">{projName(r.project_id)}</td>
                      <td className="px-4 py-3 capitalize"><span className={r.type==='functional' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal' : r.type==='non_functional' ? 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal' : r.type==='business' ? 'inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 capitalize font-normal' : r.type==='performance' ? 'inline-block px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 capitalize font-normal' : r.type==='security' ? 'inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 capitalize font-normal' : r.type==='technical' ? 'inline-block px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 capitalize font-normal' : r.type==='user_story' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal' : r.type==='automation' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : r.type==='regression' ? 'inline-block px-2 py-0.5 rounded bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 capitalize font-normal' : r.type==='e2e' ? 'inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 capitalize font-normal' : ''}>{r.type}</span></td>
                      <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal">{r.priority}</span></td>
                      <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal">{r.status}</span></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No requirements found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}