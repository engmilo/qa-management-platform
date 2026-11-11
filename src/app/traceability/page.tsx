'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Search } from 'lucide-react';

type TraceRow = {
  id: string;
  requirement_key?: string | null;
  key?: string | null;
  title: string;
  status: string;
  project_id: string;
  projects?: { name: string; key: string } | null;
  test_cases?: { id: string; case_key: string; title: string; status?: string | null }[] | null;
  test_case_count?: number | null;
  defect_count?: number | null;
  defects?: { id: string; defect_key: string }[] | null;
  coverage?: string | null;
};

type Project = { id: string; name: string; key: string };

const COVERAGE_META: Record<string, { label: string; badge: string }> = {
  covered: { label: 'Covered', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]' },
  partial: { label: 'Partial', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' },
  not_covered: { label: 'Not Covered', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  no_cases: { label: 'No Test Cases', badge: 'bg-slate-50 text-slate-500 border-slate-200' },
};

export default function TraceabilityPage() {
  const [rows, setRows] = useState<TraceRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [coverageFilter, setCoverageFilter] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [tRes, pRes] = await Promise.all([
          fetch('/api/traceability', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
        ]);
        const tData = await tRes.json();
        const pData = await pRes.json();
        if (!tRes.ok) throw new Error(tData.error || 'Could not load traceability.');
        setRows(tData.traceability ?? tData.rows ?? tData.requirements ?? []);
        setProjects(pData.projects ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load traceability.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const coverageOf = (r: TraceRow) => {
    if (r.coverage) return r.coverage;
    const count = r.test_case_count ?? r.test_cases?.length ?? 0;
    if (count === 0) return 'not_covered';
    return 'covered';
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (projectFilter !== 'all' && r.project_id !== projectFilter) return false;
    if (coverageFilter !== 'all' && coverageOf(r) !== coverageFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const key = (r.requirement_key || r.key || '').toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !key.includes(q)) return false;
    }
    return true;
  }), [rows, projectFilter, coverageFilter, search]);

  const total = filtered.length;
  const covered = filtered.filter((r) => coverageOf(r) === 'covered').length;
  const pct = total === 0 ? 0 : Math.round((covered / total) * 100);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Traceability</h1>
                <p className="text-xs text-slate-500 mt-0.5">Requirements → Test Cases → Defects coverage.</p>
              </div>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requirements..." className="pl-8 pr-3 py-1.5 border rounded text-xs w-64" />
                </div>
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
                </select>
                <select value={coverageFilter} onChange={(e) => setCoverageFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-semibold bg-white dark:bg-[#1f2c3f]">
                  <option value="all">All Coverage</option>
                  <option value="covered">Covered</option>
                  <option value="partial">Partial</option>
                  <option value="not_covered">Not Covered</option>
                </select>
                <span className="ml-auto text-xs font-semibold">{covered} of {total} covered · {pct}%</span>
              </div>
            </div>

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading traceability...</div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">No requirements found.</div>
            ) : (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Requirement</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Project</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Test Cases</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Defects</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => {
                        const cov = coverageOf(r);
                        const meta = COVERAGE_META[cov] || { label: cov, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
                        const tcCount = r.test_case_count ?? r.test_cases?.length ?? 0;
                        const dCount = r.defect_count ?? r.defects?.length ?? 0;
                        const key = r.requirement_key || r.key || '';
                        return (
                          <tr key={r.id} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0 hover:bg-slate-50 dark:hover:bg-[#1a2636]">
                            <td className="px-4 py-3">
                              <Link href={`/requirements/${r.id}`} className="text-xs font-semibold text-[#276fbf] hover:underline">{key ? `${key} — ` : ''}{r.title}</Link>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{r.projects?.key} — {r.projects?.name}</td>
                            <td className="px-4 py-3 text-xs font-semibold">{tcCount}</td>
                            <td className="px-4 py-3 text-xs font-semibold">{dCount}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold border ${meta.badge}`}>{meta.label}</span></td>
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