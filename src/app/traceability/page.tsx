'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import { Sidebar } from '@/components/dashboard/sidebar';

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
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Traceability Matrix</h1>
            <p className="text-muted-foreground mt-1">
              Requirement coverage from linked test cases and their open defects.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="rounded-md border border-red-400/40 px-3 py-1.5 hover:bg-red-500/10"
              >
                Retry
              </button>
            </div>
          )}

          <section aria-label="Traceability summary" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Requirements" value={loading ? '—' : summary.totalRequirements} />
            <SummaryCard label="Covered Requirements" value={loading ? '—' : summary.coveredRequirements} />
            <SummaryCard label="Coverage" value={loading ? '—' : `${summary.coveragePercentage}%`} />
            <SummaryCard label="Open Linked Defects" value={loading ? '—' : summary.openDefects} />
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-secondary">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="p-4 text-left text-sm font-medium text-muted-foreground">Requirement</th>
                    <th scope="col" className="p-4 text-left text-sm font-medium text-muted-foreground">Linked Test Cases</th>
                    <th scope="col" className="p-4 text-left text-sm font-medium text-muted-foreground">Coverage</th>
                    <th scope="col" className="p-4 text-left text-sm font-medium text-muted-foreground">Open Defects</th>
                    <th scope="col" className="p-4 text-left text-sm font-medium text-muted-foreground">Requirement Status</th>
                    <th scope="col" className="p-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Loading traceability data…</td></tr>
                  ) : error ? (
                    <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Traceability data is unavailable. Retry after resolving the error above.</td></tr>
                  ) : rows.length ? rows.map((row) => (
                    <tr key={row.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-4 align-top">
                        <div className="font-mono text-sm font-semibold text-foreground">{row.key}</div>
                        <div className="mt-1 text-sm text-foreground">{row.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{row.projectName}</div>
                      </td>
                      <td className="p-4 align-top">
                        {row.testCases.length ? (
                          <div className="space-y-2">
                            {row.testCases.map((testCase) => (
                              <div key={testCase.id} className="text-sm">
                                <span className="mr-2 rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">{testCase.key}</span>
                                <span className="text-muted-foreground">{testCase.title}</span>
                              </div>
                            ))}
                          </div>
                        ) : <span className="text-sm text-muted-foreground">No test cases linked</span>}
                      </td>
                      <td className="p-4 align-top">
                        {row.testCases.length ? (
                          <span className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-400">Covered</span>
                        ) : (
                          <span className="rounded bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400">Uncovered</span>
                        )}
                      </td>
                      <td className="p-4 align-top">
                        <span className={row.openDefects ? 'text-sm text-red-400' : 'text-sm text-green-400'}>
                          {row.openDefects}
                        </span>
                      </td>
                      <td className="p-4 align-top">
                        <span className="rounded bg-muted px-2 py-1 text-xs capitalize text-foreground">
                          {row.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 align-top">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRequirementId(row.id);
                            setEditingProjectId(row.projectId);
                            setLinkError('');
                          }}
                          className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
                        >
                          Manage links
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <p className="text-sm text-muted-foreground">No requirements found for your organizations.</p>
                        <Link href="/requirements/new" className="mt-3 inline-block text-sm text-primary hover:underline">
                          Create a requirement
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="link-dialog-title" className="w-full max-w-xl rounded-lg border border-border bg-secondary p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="link-dialog-title" className="text-lg font-semibold text-foreground">Link test cases</h2>
                <p className="mt-1 text-sm text-muted-foreground">{editingRequirement.key}: {editingRequirement.title}</p>
              </div>
              <button type="button" onClick={closeLinkManager} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close link manager">×</button>
            </div>

            {linkError && <p role="alert" className="mb-3 text-sm text-red-400">{linkError}</p>}
            {testCaseLoadError && <p role="alert" className="mb-3 text-sm text-red-400">{testCaseLoadError}</p>}
            {loadingTestCases ? (
              <p className="py-4 text-sm text-muted-foreground">Loading project test cases…</p>
            ) : availableTestCases.length ? (
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                {availableTestCases.map((testCase) => (
                  <label key={testCase.id} className="flex cursor-pointer items-start gap-3 rounded px-2 py-2 text-sm text-foreground hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={editingRequirement.testCases.some((item) => item.id === testCase.id)}
                      disabled={!!updatingCaseId}
                      onChange={(event) => toggleTestCaseLink(testCase.id, event.target.checked)}
                      className="mt-1 accent-primary"
                    />
                    <span><span className="mr-2 font-mono text-muted-foreground">{testCase.case_key}</span>{testCase.title}</span>
                    {updatingCaseId === testCase.id && <span className="ml-auto text-xs text-muted-foreground">Saving…</span>}
                  </label>
                ))}
              </div>
            ) : !testCaseLoadError ? (
              <p className="py-4 text-sm text-muted-foreground">This project has no test cases to link.</p>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={closeLinkManager} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">Done</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-secondary p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
