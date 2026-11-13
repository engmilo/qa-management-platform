"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type TC = { id: string; case_key?: string; code?: string; title: string; priority: string; test_type?: string; type?: string; category: string; status?: string; project_id?: string };

export default function TestCasesPage() {
  const [cases, setCases] = useState<TC[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch('/api/test-cases', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
        ]);
        const cJ = await cRes.json().catch(() => ({}));
        const pJ = await pRes.json().catch(() => ({}));
        setCases(cJ.testCases ?? cJ.test_cases ?? cJ ?? []);
        setProjects(pJ.projects ?? pJ ?? []);
      } catch { setCases([]); } finally { setLoading(false); }
    })();
  }, []);

  const statusBadge = (s?: string) => {
    const v = (s ?? '').toLowerCase();
    if (v === 'approved') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (v === 'ready') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    if (v === 'deprecated') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    if (v === 'draft') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  };

  const filtered = cases.filter((c) => {
    if (search && !`${c.case_key ?? c.code ?? ''} ${c.title}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (projectFilter && String(c.project_id) !== projectFilter) return false;
    if (priorityFilter && c.priority !== priorityFilter) return false;
    if (typeFilter && (c.test_type ?? c.type) !== typeFilter) return false;
    if (statusFilter && (c.status ?? '') !== statusFilter) return false;
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
                <h1 className="dark:text-white text-base font-bold text-slate-900 tracking-tight">Test Cases</h1>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Design and manage test cases.</p>
              </div>
              <div className="flex gap-2">
                <Link href="/api/test-cases/export" className="text-xs font-semibold border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-1.5">Export CSV</Link>
                <Link href="/test-cases/import" className="text-xs font-semibold border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-1.5">Import</Link>
                <Link href="/test-cases/new" className="text-xs font-normal bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5">+ New Test Case</Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-3 mt-4">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search case key or title..." className="text-xs font-normal bg-white dark:bg-[#101622] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5 w-56" />
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5">
                <option value="">All Projects</option>
                {projects.map((p: any) => (<option key={p.id} value={String(p.id)}>{p.name}</option>))}
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5">
                <option value="">All Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5">
                <option value="">All Types</option><option value="functional">Functional</option><option value="regression">Regression</option><option value="smoke">Smoke</option><option value="security">Security</option><option value="performance">Performance</option><option value="integration">Integration</option><option value="ui">UI</option><option value="api">API</option><option value="automation">Automation</option><option value="e2e">E2E</option><option value="uat">UAT</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5">
                <option value="">All Status</option><option value="draft">Draft</option><option value="ready">Ready</option><option value="approved">Approved</option><option value="deprecated">Deprecated</option>
              </select>
              <span className="text-xs font-semibold text-slate-500">{filtered.length} of {cases.length}</span>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md overflow-hidden mt-4">
              <table className="w-full text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1a2639] text-left text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-2.5">Key</th><th className="px-4 py-2.5">Title</th><th className="px-4 py-2.5">Priority</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-t border-slate-200 dark:border-slate-700/50">
                      <td className="px-4 py-3"><Link href={`/test-cases/${c.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{c.case_key ?? c.code ?? ''}</Link></td>
                      <td className="px-4 py-3"><Link href={`/test-cases/${c.id}`} className="hover:underline">{c.title}</Link></td>
                      <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal">{c.priority}</span></td>
                      <td className="px-4 py-3"><span className={(c.test_type ?? c.type ?? '')==='functional' ? 'inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='regression' ? 'inline-block px-2 py-0.5 rounded bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='smoke' ? 'inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='security' ? 'inline-block px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='performance' ? 'inline-block px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='integration' ? 'inline-block px-2 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='ui' ? 'inline-block px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='api' ? 'inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='automation' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='e2e' ? 'inline-block px-2 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 capitalize font-normal' : (c.test_type ?? c.type ?? '')==='uat' ? 'inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 capitalize font-normal' : ''}>{(c.test_type ?? c.type ?? '')==='e2e' ? 'E2E' : (c.test_type ?? c.type ?? '')==='uat' ? 'UAT' : (c.test_type ?? c.type ?? '')==='api' ? 'API' : (c.test_type ?? c.type ?? '')==='ui' ? 'UI' : (c.test_type ?? c.type ?? '')}</span></td>
                      <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 capitalize font-normal">{c.category}</span></td>
                      <td className="px-4 py-3">
                        {/* FIX: Status now comes from DB column (Step 1) + API (Step 2). Before it was undefined -> "—" */}
                        {c.status ? <span className={`inline-block px-2 py-0.5 rounded capitalize font-normal ${statusBadge(c.status)}`}>{c.status}</span> : <span>—</span>}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No test cases found.</td></tr>}
                  {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Loading test cases...</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}