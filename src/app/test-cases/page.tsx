'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Search, Plus, Download, Upload } from 'lucide-react';

type TestCase = {
  id: string;
  case_key: string;
  title: string;
  priority: string;
  test_type: string;
  category: string;
  status: string;
  project_id: string;
  projects?: { name: string; key: string } | null;
};

type Project = { id: string; name: string; key: string };

const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  high: { label: 'High', badge: 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]' },
  medium: { label: 'Medium', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
  low: { label: 'Low', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const STATUS_META: Record<string, { label: string; badge: string }> = {
  active: { label: 'Active', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  draft: { label: 'Draft', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  deprecated: { label: 'Deprecated', badge: 'bg-slate-50 text-slate-500 border-slate-200' },
};

export default function TestCasesPage() {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [cRes, pRes] = await Promise.all([
          fetch('/api/test-cases', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
        ]);
        const cData = await cRes.json();
        const pData = await pRes.json();
        if (!cRes.ok) throw new Error(cData.error || 'Could not load test cases.');
        setCases(cData.testCases ?? cData.cases ?? []);
        setProjects(pData.projects ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load test cases.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    cases.forEach((c) => { if (c.test_type) s.add(c.test_type); });
    return Array.from(s).sort();
  }, [cases]);

  const filtered = useMemo(() => cases.filter((c) => {
    if (projectFilter !== 'all' && c.project_id !== projectFilter) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && c.test_type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.case_key.toLowerCase().includes(q) && !(c.category ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [cases, projectFilter, priorityFilter, typeFilter, search]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter !== 'all') params.set('projectId', projectFilter);
      const res = await fetch(`/api/test-cases/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'test-cases.csv'; a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Test Cases</h1>
                <p className="text-xs text-slate-500 mt-0.5">Design and manage test cases.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={exportCsv} disabled={exporting} className="bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 border border-[#d8dee4] dark:border-[#28374d] text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" />{exporting ? 'Exporting...' : 'Export CSV'}</button>
                <Link href="/test-cases/import" className="bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 border border-[#d8dee4] dark:border-[#28374d] text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Import</Link>
                <Link href="/test-cases/new" className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> New Test Case</Link>
              </div>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search case key or title..." className="pl-8 pr-3 py-1.5 border rounded text-xs w-64" />
                </div>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
                </select>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Types</option>
                  {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading test cases...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">No test cases found.</div>
            ) : (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Key</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Title</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Priority</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Type</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Category</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => {
                        const pri = PRIORITY_META[c.priority] || { label: c.priority, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                        const st = STATUS_META[c.status] || { label: c.status, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                        return (
                          <tr key={c.id} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1a2636]">
                            <td className="px-4 py-3"><Link href={`/test-cases/${c.id}`} className="font-mono text-xs font-bold text-[#276fbf] hover:underline">{c.case_key}</Link></td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white max-w- truncate">{c.title}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border ${pri.badge}`}>{pri.label}</span></td>
                            <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs font-semibold border bg-white text-slate-600 border-[#d8dee4]">{c.test_type}</span></td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{c.category}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border ${st.badge}`}>{st.label}</span></td>
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