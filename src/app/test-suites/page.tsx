'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Search, Plus, FileText } from 'lucide-react';

type TestSuite = {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
  test_plan_id: string | null;
  sort_order?: number | null;
  projects?: { name: string; key: string } | null;
  test_plans?: { title: string; name?: string } | null;
};

type Project = { id: string; name: string; key: string };
type TestPlan = { id: string; title?: string | null; name?: string | null };

export default function TestSuitesPage() {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [sRes, pRes, tRes] = await Promise.all([
          fetch('/api/test-suites', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
          fetch('/api/test-plans', { cache: 'no-store' }),
        ]);
        const sText = await sRes.text();
        const pText = await pRes.text();
        const tText = await tRes.text();
        const sData = sText ? JSON.parse(sText) : {};
        const pData = pText ? JSON.parse(pText) : {};
        const tData = tText ? JSON.parse(tText) : {};
        if (!sRes.ok) throw new Error(sData.error || 'Could not load test suites.');
        setSuites(sData.testSuites ?? sData.suites ?? []);
        setProjects(pData.projects ?? []);
        setPlans(tData.testPlans ?? tData.plans ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load test suites.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const projectNames = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, `${p.key} — ${p.name}`])), [projects]);
  const planNames = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p.title || p.name || 'Untitled'])), [plans]);

  const suiteProject = (s: TestSuite) => {
    if (s.projects) return `${s.projects.key} — ${s.projects.name}`;
    if (s.project_id) return projectNames[s.project_id] || '—';
    return '—';
  };
  const suitePlan = (s: TestSuite) => {
    if (s.test_plans) return s.test_plans.title || s.test_plans.name || '—';
    if (s.test_plan_id) return planNames[s.test_plan_id] || '—';
    return '—';
  };

  const filtered = useMemo(() => suites.filter((s) => {
    if (projectFilter !== 'all' && s.project_id !== projectFilter) return false;
    if (planFilter !== 'all' && s.test_plan_id !== planFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !(s.description ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [suites, projectFilter, planFilter, search]);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Test Suites</h1>
                <p className="text-xs text-slate-500 mt-0.5">Group test cases into suites by feature or plan.</p>
              </div>
              <Link href="/test-suites/new" className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> New Test Suite</Link>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search test suites..." className="pl-8 pr-3 py-1.5 border rounded text-xs w-64 max-w-full" />
                </div>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
                </select>
                <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Test Plans</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.title || p.name}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading test suites...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center shadow-sm">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No test suites found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">Create a suite to group related test cases.</p>
                <Link href="/test-suites/new" className="mt-4 inline-flex items-center gap-1.5 bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded">Create your first test suite</Link>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <table className="w-full table-fixed text-left">
                  <colgroup><col className="w-[28%]" /><col className="w-[30%]" /><col className="w-[21%]" /><col className="w-[21%]" /></colgroup>
                  <thead>
                    <tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Name</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Description</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Project</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Test Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1a2636] align-top">
                        <td className="px-4 py-3 break-words whitespace-normal"><Link href={`/test-suites/${s.id}`} className="text-xs font-semibold text-[#276fbf] hover:underline break-words">{s.name}</Link></td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal">{s.description || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal">{suiteProject(s)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 break-words whitespace-normal">{suitePlan(s)}</td>
                      </tr>
                    ))}
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