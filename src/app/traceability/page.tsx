'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Sidebar } from '@/components/dashboard/sidebar';
import { GitFork, CheckCircle2, AlertTriangle, Layers, X, Search } from 'lucide-react';

type TraceabilityTestCase = { id: string; key: string; title: string };
type TestCaseOption = { id: string; case_key: string; title: string };
type TraceabilityRow = {
  id: string;
  projectId: string;
  key: string;
  title: string;
  status: string;
  projectName: string;
  testCases: TraceabilityTestCase[];
  openDefects: number;
};
type TraceabilitySummary = {
  totalRequirements: number;
  coveredRequirements: number;
  coveragePercentage: number;
  openDefects: number;
};

const EMPTY_SUMMARY: TraceabilitySummary = {
  totalRequirements: 0,
  coveredRequirements: 0,
  coveragePercentage: 0,
  openDefects: 0,
};

const PAGE_SIZE = 20;

export default function TraceabilityPage() {
  const [rows, setRows] = useState<TraceabilityRow[]>([]);
  const [summary, setSummary] = useState<TraceabilitySummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [editingRequirementId, setEditingRequirementId] = useState('');
  const [editingProjectId, setEditingProjectId] = useState('');
  const [availableTestCases, setAvailableTestCases] = useState<TestCaseOption[]>([]);
  const [loadingTestCases, setLoadingTestCases] = useState(false);
  const [testCaseLoadError, setTestCaseLoadError] = useState('');
  const [linkError, setLinkError] = useState('');
  const [updatingCaseId, setUpdatingCaseId] = useState('');
  const editingRequirement = rows.find((row) => row.id === editingRequirementId) ?? null;

  // Search / filter / pagination — same pattern as other lists
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [coverageFilter, setCoverageFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetch('/api/traceability', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load traceability data.');
        return data as { requirements: TraceabilityRow[]; summary: TraceabilitySummary };
      })
      .then((data) => {
        if (!active) return;
        setRows(data.requirements ?? []);
        setSummary(data.summary ?? EMPTY_SUMMARY);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setRows([]);
        setSummary(EMPTY_SUMMARY);
        setError(loadError instanceof Error ? loadError.message : 'Could not load traceability data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    let active = true;
    setAvailableTestCases([]);
    setTestCaseLoadError('');
    if (!editingProjectId) return () => { active = false; };

    setLoadingTestCases(true);
    fetch(`/api/test-cases?projectId=${encodeURIComponent(editingProjectId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load test cases.');
        return data as { testCases: TestCaseOption[] };
      })
      .then((data) => {
        if (active) setAvailableTestCases(data.testCases ?? []);
      })
      .catch((loadError: unknown) => {
        if (active) setTestCaseLoadError(loadError instanceof Error ? loadError.message : 'Could not load test cases.');
      })
      .finally(() => {
        if (active) setLoadingTestCases(false);
      });

    return () => { active = false; };
  }, [editingProjectId]);

  const toggleTestCaseLink = async (testCaseId: string, checked: boolean) => {
    if (!editingRequirement) return;
    setUpdatingCaseId(testCaseId);
    setLinkError('');

    try {
      const response = await fetch('/api/traceability', {
        method: checked ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementId: editingRequirement.id, testCaseId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update this requirement link.');
      setRetry((value) => value + 1);
    } catch (linkUpdateError: unknown) {
      setLinkError(linkUpdateError instanceof Error ? linkUpdateError.message : 'Could not update this requirement link.');
    } finally {
      setUpdatingCaseId('');
    }
  };

  const closeLinkManager = () => {
    setEditingRequirementId('');
    setEditingProjectId('');
    setAvailableTestCases([]);
    setLinkError('');
  };

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => { if (r.projectId) map.set(r.projectId, r.projectName || 'General'); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !`${row.key} ${row.title} ${row.projectName}`.toLowerCase().includes(q)) return false;
      if (projectFilter && row.projectId !== projectFilter) return false;
      if (coverageFilter === 'covered' && row.testCases.length === 0) return false;
      if (coverageFilter === 'uncovered' && row.testCases.length > 0) return false;
      return true;
    });
  }, [rows, search, projectFilter, coverageFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearAll = () => { setSearch(''); setProjectFilter(''); setCoverageFilter(''); setPage(1); };
  const hasFilter = search || projectFilter || coverageFilter;

  const selectCls = "border border-[#d8dee4] dark:border-[#28374d] rounded px-2.5 py-2 text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#48a43f]";

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header row */}
          <div className="mb-6 pb-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Traceability Matrix</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Requirement-to-test coverage verification and open defect correlation
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs font-medium">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="btn-testrail-secondary text-xs py-1"
              >
                Retry
              </button>
            </div>
          )}

          {/* TestRail Summary Cards */}
          <section aria-label="Traceability summary" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total Requirements" value={loading ? '' : summary.totalRequirements} icon={Layers} border="border-t-4 border-[#276fbf]" />
            <SummaryCard label="Covered Requirements" value={loading ? '' : summary.coveredRequirements} icon={CheckCircle2} border="border-t-4 border-[#48a43f]" />
            <SummaryCard label="Test Coverage" value={loading ? '' : `${summary.coveragePercentage}%`} icon={GitFork} border="border-t-4 border-indigo-500" />
            <SummaryCard label="Open Linked Defects" value={loading ? '' : summary.openDefects} icon={AlertTriangle} border="border-t-4 border-amber-500" />
          </section>

          {/* Search / Filter */}
          <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-3 mb-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by requirement key, title or project, e.g. REQ-101..." className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#48a43f]" />
              </div>
              {hasFilter && <button onClick={clearAll} className="inline-flex items-center gap-1 border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-200 bg-white dark:bg-[#182232] hover:bg-slate-50 dark:hover:bg-[#202c3e]"><X className="w-3.5 h-3.5" /> Clear</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Projects</option>
                {projectOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={coverageFilter} onChange={(e) => { setCoverageFilter(e.target.value); setPage(1); }} className={selectCls}>
                <option value="">All Coverage</option>
                <option value="covered">Covered</option>
                <option value="uncovered">Uncovered</option>
              </select>
              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 self-center">Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-{Math.min(filtered.length, safePage * PAGE_SIZE)} of {filtered.length} {filtered.length !== rows.length ? `(filtered from ${rows.length})` : ''}</span>
            </div>
          </div>

          {/* Traceability Table */}
          <section className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w- text-left">
                <thead className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                  <tr>
                    <th scope="col" className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Requirement</th>
                    <th scope="col" className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Linked Test Cases</th>
                    <th scope="col" className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Coverage</th>
                    <th scope="col" className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Open Defects</th>
                    <th scope="col" className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f7] dark:divide-[#222e3e]">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">Loading traceability matrix</td></tr>
                  ) : error ? (
                    <tr><td colSpan={6} className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">Traceability data is unavailable. Retry after resolving the error above.</td></tr>
                  ) : filtered.length === 0 && rows.length > 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">No requirements match your search.</p>
                      <button onClick={clearAll} className="mt-3 border border-[#d8dee4] dark:border-[#28374d] rounded px-3.5 py-2 text-xs font-semibold bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100">Clear all filters</button>
                    </td></tr>
                  ) : paged.length ? paged.map((row) => (
                    <tr key={row.id} className="hover:bg-[#f8fafc] dark:hover:bg-[#1f2c3f] transition-colors">
                      <td className="px-4 py-3.5 align-top">
                        <span className="font-mono text-xs font-bold text-[#276fbf] dark:text-[#4da3ff] bg-[#eef5fc] dark:bg-[#132a4a] border border-[#d2e3f5] dark:border-[#1e4d6d] px-2 py-0.5 rounded">
                          {row.key}
                        </span>
                        <div className="mt-1.5 text-xs font-semibold text-slate-900 dark:text-white">{row.title}</div>
                        <div className="mt-0.5 text- text-slate-500 dark:text-slate-400">{row.projectName}</div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        {row.testCases.length ? (
                          <div className="space-y-1.5">
                            {row.testCases.map((testCase) => (
                              <div key={testCase.id} className="text-xs flex items-center gap-1.5">
                                <span className="rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 font-mono text- font-bold text-slate-700 dark:text-slate-200">{testCase.key}</span>
                                <span className="text-slate-700 dark:text-slate-200 truncate max-w-xs">{testCase.title}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">No test cases linked</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        {row.testCases.length ? (
                          <span className="bg-[#dff0d8] dark:bg-[#132c1c] text-[#3c763d] dark:text-[#52c41a] border border-[#d6e9c6] dark:border-[#1d4c2b] font-semibold text- px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            ✓ Covered
                          </span>
                        ) : (
                          <span className="bg-[#fcf8e3] dark:bg-[#332711] text-[#8a6d3b] dark:text-[#faad14] border border-[#faebcc] dark:border-[#534019] font-semibold text- px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            ○ Uncovered
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span className={`text-xs font-bold ${row.openDefects ? 'text-red-600 dark:text-red-400' : 'text-[#3c763d] dark:text-[#52c41a]'}`}>
                          {row.openDefects}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span className="inline-block text- font-semibold px-2 py-0.5 rounded-full capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {row.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRequirementId(row.id);
                            setEditingProjectId(row.projectId);
                            setLinkError('');
                          }}
                          className="btn-testrail-secondary text-xs py-1 px-2.5"
                        >
                          Manage links
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">No requirements found for your organizations.</p>
                        <Link href="/requirements/new" className="mt-2 inline-block text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:underline">
                          + Create a requirement
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">Page {safePage} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-40 bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100">← Prev</button>
              <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-40 bg-white dark:bg-[#182232] text-slate-800 dark:text-slate-100">Next →</button>
            </div>
          </div>
        </main>
      </div>

      {editingRequirement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="link-dialog-title" className="w-full max-w-xl rounded-md border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#182232] p-6 shadow-2xl">
            <div className="mb-4 pb-3 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-start justify-between gap-4">
              <div>
                <h2 id="link-dialog-title" className="text-sm font-bold text-slate-900 dark:text-white">Link Test Cases to Requirement</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-bold text-[#276fbf] dark:text-[#4da3ff]">{editingRequirement.key}:</span> {editingRequirement.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLinkManager}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#202c3e] hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Close link manager"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {linkError && <p role="alert" className="mb-3 text-xs text-red-600 dark:text-red-400 font-medium">{linkError}</p>}
            {testCaseLoadError && <p role="alert" className="mb-3 text-xs text-red-600 dark:text-red-400 font-medium">{testCaseLoadError}</p>}
            {loadingTestCases ? (
              <p className="py-4 text-xs text-slate-400 dark:text-slate-500 text-center">Loading project test cases</p>
            ) : availableTestCases.length ? (
              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded border border-[#d8dee4] dark:border-[#28374d] p-3 bg-[#f8fafc]/50 dark:bg-[#141d28]/50">
                {availableTestCases.map((testCase) => (
                  <label key={testCase.id} className="flex cursor-pointer items-start gap-2.5 rounded p-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#202c3e] hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-[#28374d] transition-all">
                    <input
                      type="checkbox"
                      checked={editingRequirement.testCases.some((item) => item.id === testCase.id)}
                      disabled={!!updatingCaseId}
                      onChange={(event) => toggleTestCaseLink(testCase.id, event.target.checked)}
                      className="mt-0.5 accent-[#48a43f]"
                    />
                    <span>
                      <span className="mr-1.5 font-mono font-bold text-[#276fbf] dark:text-[#4da3ff]">{testCase.case_key}</span>
                      {testCase.title}
                    </span>
                    {updatingCaseId === testCase.id && <span className="ml-auto text- text-slate-400 dark:text-slate-500">Saving</span>}
                  </label>
                ))}
              </div>
            ) : !testCaseLoadError ? (
              <p className="py-4 text-xs text-slate-400 dark:text-slate-500 text-center">This project has no test cases to link.</p>
            ) : null}

            <div className="mt-5 pt-3 border-t border-[#edf2f7] dark:border-[#222e3e] flex justify-end">
              <button
                type="button"
                onClick={closeLinkManager}
                className="btn-testrail-primary"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, border }: { label: string; value: string | number; icon: any; border: string }) {
  return (
    <div className={`rounded-md border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#182232] p-4 shadow-sm flex flex-col justify-between ${border}`}>
      <div className="flex items-center justify-between">
        <p className="text- font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
        <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
    </div>
  );
}