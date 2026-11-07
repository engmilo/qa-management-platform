'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Sidebar } from '@/components/dashboard/sidebar';
import { GitFork, CheckCircle2, AlertTriangle, Layers, X } from 'lucide-react';

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

  return (
    <div className="flex h-screen bg-[#f5f7f9]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header row */}
          <div className="mb-6 pb-4 border-b border-[#e2e8f0]">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Traceability Matrix</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Requirement-to-test coverage verification and open defect correlation
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium">
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
            <SummaryCard label="Total Requirements" value={loading ? '—' : summary.totalRequirements} icon={Layers} border="border-t-4 border-[#276fbf]" />
            <SummaryCard label="Covered Requirements" value={loading ? '—' : summary.coveredRequirements} icon={CheckCircle2} border="border-t-4 border-[#48a43f]" />
            <SummaryCard label="Test Coverage" value={loading ? '—' : `${summary.coveragePercentage}%`} icon={GitFork} border="border-t-4 border-indigo-500" />
            <SummaryCard label="Open Linked Defects" value={loading ? '—' : summary.openDefects} icon={AlertTriangle} border="border-t-4 border-amber-500" />
          </section>

          {/* Traceability Table */}
          <section className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Requirement</th>
                    <th scope="col" className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Linked Test Cases</th>
                    <th scope="col" className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Coverage</th>
                    <th scope="col" className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Open Defects</th>
                    <th scope="col" className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2f7]">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-xs text-slate-500">Loading traceability matrix…</td></tr>
                  ) : error ? (
                    <tr><td colSpan={6} className="p-8 text-center text-xs text-slate-500">Traceability data is unavailable. Retry after resolving the error above.</td></tr>
                  ) : rows.length ? rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-4 py-3.5 align-top">
                        <span className="font-mono text-xs font-bold text-[#276fbf] bg-[#eef5fc] border border-[#d2e3f5] px-2 py-0.5 rounded">
                          {row.key}
                        </span>
                        <div className="mt-1.5 text-xs font-semibold text-slate-900">{row.title}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{row.projectName}</div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        {row.testCases.length ? (
                          <div className="space-y-1.5">
                            {row.testCases.map((testCase) => (
                              <div key={testCase.id} className="text-xs flex items-center gap-1.5">
                                <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">{testCase.key}</span>
                                <span className="text-slate-700 truncate max-w-xs">{testCase.title}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No test cases linked</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        {row.testCases.length ? (
                          <span className="bg-[#dff0d8] text-[#3c763d] border border-[#d6e9c6] font-semibold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            ✓ Covered
                          </span>
                        ) : (
                          <span className="bg-[#fcf8e3] text-[#8a6d3b] border border-[#faebcc] font-semibold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            ⚠ Uncovered
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span className={`text-xs font-bold ${row.openDefects ? 'text-red-600' : 'text-[#3c763d]'}`}>
                          {row.openDefects}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-slate-100 text-slate-700 border border-slate-200">
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
                        <p className="text-xs text-slate-500">No requirements found for your organizations.</p>
                        <Link href="/requirements/new" className="mt-2 inline-block text-xs font-semibold text-[#276fbf] hover:underline">
                          + Create a requirement
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {editingRequirement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="link-dialog-title" className="w-full max-w-xl rounded-md border border-[#d8dee4] bg-white p-6 shadow-2xl">
            <div className="mb-4 pb-3 border-b border-[#e2e8f0] flex items-start justify-between gap-4">
              <div>
                <h2 id="link-dialog-title" className="text-sm font-bold text-slate-900">Link Test Cases to Requirement</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="font-mono font-bold text-[#276fbf]">{editingRequirement.key}:</span> {editingRequirement.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLinkManager}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close link manager"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {linkError && <p role="alert" className="mb-3 text-xs text-red-600 font-medium">{linkError}</p>}
            {testCaseLoadError && <p role="alert" className="mb-3 text-xs text-red-600 font-medium">{testCaseLoadError}</p>}
            {loadingTestCases ? (
              <p className="py-4 text-xs text-slate-400 text-center">Loading project test cases…</p>
            ) : availableTestCases.length ? (
              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded border border-[#d8dee4] p-3 bg-[#f8fafc]/50">
                {availableTestCases.map((testCase) => (
                  <label key={testCase.id} className="flex cursor-pointer items-start gap-2.5 rounded p-2 text-xs text-slate-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
                    <input
                      type="checkbox"
                      checked={editingRequirement.testCases.some((item) => item.id === testCase.id)}
                      disabled={!!updatingCaseId}
                      onChange={(event) => toggleTestCaseLink(testCase.id, event.target.checked)}
                      className="mt-0.5 accent-[#48a43f]"
                    />
                    <span>
                      <span className="mr-1.5 font-mono font-bold text-[#276fbf]">{testCase.case_key}</span>
                      {testCase.title}
                    </span>
                    {updatingCaseId === testCase.id && <span className="ml-auto text-[10px] text-slate-400">Saving…</span>}
                  </label>
                ))}
              </div>
            ) : !testCaseLoadError ? (
              <p className="py-4 text-xs text-slate-400 text-center">This project has no test cases to link.</p>
            ) : null}

            <div className="mt-5 pt-3 border-t border-[#edf2f7] flex justify-end">
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
    <div className={`rounded-md border border-[#d8dee4] bg-white p-4 shadow-sm flex flex-col justify-between ${border}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
    </div>
  );
}
