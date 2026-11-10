'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { StepExecutionPanel, type StepChangedUpdate } from '@/components/test-runs/step-execution-panel';
import { ArrowLeft, ChevronDown, ChevronRight, PlayCircle, Bug } from 'lucide-react';

type TestRun = { id: string; name: string; status: string; description?: string | null; configuration?: string | null; test_plan_id?: string | null; project_id?: string; started_at?: string; completed_at?: string | null; };
type Execution = { id: string; test_run_id: string; test_case_id: string; status: string; actual_result?: string | null; comments?: string | null; tester_id?: string | null; executed_at?: string | null; test_cases?: { case_key: string; title: string; description?: string | null; preconditions?: string | null } | null; case_key?: string; title?: string; description?: string | null; preconditions?: string | null; };
type Draft = { status: string; actual_result: string; comments: string };
type StepStats = { total: number; passed: number; failed: number; blocked: number; retest: number; notRun: number; executed: number };

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'not_run', label: 'Not Run' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'retest', label: 'Retest' },
] as const;

function getCaseKey(exec: Execution) { return exec.test_cases?.case_key ?? exec.case_key ?? '—'; }
function getTitle(exec: Execution) { return exec.test_cases?.title ?? exec.title ?? 'Untitled test case'; }
function getDescription(exec: Execution) { return exec.test_cases?.description ?? exec.description ?? ''; }
function getPreconditions(exec: Execution) { return exec.test_cases?.preconditions ?? exec.preconditions ?? ''; }
function statusBadge(status: string) {
  switch (status) {
    case 'passed': return 'bg-[#dff0d8] dark:bg-[#132c1c] text-[#3c763d] dark:text-[#52c41a] border-[#d6e9c6] dark:border-[#1d4c2b]';
    case 'failed': return 'bg-[#f2dede] dark:bg-[#34161a] text-[#a94442] dark:text-[#ff7875] border-[#ebccd1] dark:border-[#521e24]';
    case 'blocked': return 'bg-[#fcf8e3] dark:bg-[#332711] text-[#8a6d3b] dark:text-[#faad14] border-[#faebcc] dark:border-[#534019]';
    case 'retest': return 'bg-[#f3e8ff] dark:bg-[#281639] text-[#7e22ce] dark:text-[#d3adf7] border-[#e9d5ff] dark:border-[#432360]';
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
}
function statusLabel(status: string) { if (status === 'not_run') return 'Not Run'; return status.charAt(0).toUpperCase() + status.slice(1); }

export default function TestRunDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [run, setRun] = useState<TestRun | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [stepStats, setStepStats] = useState<Record<string, StepStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const isCompleted = run?.status === 'completed';

  const loadStepStats = useCallback(async (list: Execution[]) => {
    const stats: Record<string, StepStats> = {};
    await Promise.all(list.map(async (exec) => {
      try {
        const res = await fetch(`/api/test-executions/${exec.id}/steps`, { cache: 'no-store' });
        const data = await res.json();
        const steps = (data.steps ?? []) as { status: string }[];
        if (!steps.length) return;
        stats[exec.id] = {
          total: steps.length,
          passed: steps.filter((s) => s.status === 'passed').length,
          failed: steps.filter((s) => s.status === 'failed').length,
          blocked: steps.filter((s) => s.status === 'blocked').length,
          retest: steps.filter((s) => s.status === 'retest').length,
          notRun: steps.filter((s) => s.status === 'not_run' || s.status === 'untested').length,
          executed: steps.filter((s) => s.status !== 'not_run' && s.status !== 'untested').length,
        };
      } catch { /* ignore */ }
    }));
    setStepStats(stats);
  }, []);

  const loadExecutions = useCallback(async () => {
    try {
      const res = await fetch(`/api/test-runs/${id}/executions`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load executions.');
      const list: Execution[] = data.executions ?? data.testExecutions ?? (Array.isArray(data) ? data : []);
      setExecutions(list);
      setDrafts(Object.fromEntries(list.map((exec) => [exec.id, { status: exec.status ?? 'not_run', actual_result: exec.actual_result ?? '', comments: exec.comments ?? '' }])));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load executions.'); }
  }, [id]);

  const loadRun = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let runData: TestRun | null = null;
      const single = await fetch(`/api/test-runs/${id}`, { cache: 'no-store' });
      if (single.ok) {
        const data = await single.json();
        runData = data.testRun ?? data.run ?? data.test_run ?? (data.id ? data : null);
      }
      if (!runData) {
        const listRes = await fetch('/api/test-runs', { cache: 'no-store' });
        const listData = await listRes.json();
        const list: TestRun[] = listData.testRuns ?? listData.test_runs ?? [];
        runData = list.find((r) => r.id === id) ?? null;
      }
      if (!runData) throw new Error('Test run not found.');
      setRun(runData);
      await loadExecutions();
      const execRes = await fetch(`/api/test-runs/${id}/executions`, { cache: 'no-store' });
      const execData = await execRes.json().catch(() => ({}));
      const list: Execution[] = execData.executions ?? execData.testExecutions ?? (Array.isArray(execData) ? execData : []);
      if (list.length) void loadStepStats(list);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load test run.'); }
    finally { setLoading(false); }
  }, [id, loadExecutions, loadStepStats]);

  useEffect(() => { void loadRun(); }, [loadRun]);

  const handleStepChanged = useCallback((u: StepChangedUpdate) => {
    if (!u.derivedStatus) return;
    setExecutions((prev) => prev.map((e) => e.id === u.executionId ? { ...e, status: u.derivedStatus } : e));
    setDrafts((prev) => ({ ...prev, [u.executionId]: { ...(prev[u.executionId] ?? { status: u.derivedStatus, actual_result: '', comments: '' }), status: u.derivedStatus } }));
    setStepStats((prev) => ({ ...prev, [u.executionId]: { total: u.total, passed: u.passed, failed: u.failed, blocked: u.blocked, retest: u.retest, notRun: u.notRun, executed: u.executed } }));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return executions.filter((exec) => {
      if (statusFilter !== 'all' && exec.status !== statusFilter) return false;
      if (!q) return true;
      return getCaseKey(exec).toLowerCase().includes(q) || getTitle(exec).toLowerCase().includes(q);
    });
  }, [executions, statusFilter, search]);

  const counts = useMemo(() => {
    const total = executions.length;
    const passed = executions.filter((e) => e.status === 'passed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    const blocked = executions.filter((e) => e.status === 'blocked').length;
    const retest = executions.filter((e) => e.status === 'retest').length;
    const notRun = executions.filter((e) => e.status === 'not_run' || e.status === 'untested').length;
    const executed = total - notRun;
    const caseProgress = total ? Math.round((executed / total) * 100) : 0;
    return { total, passed, failed, blocked, retest, notRun, caseProgress };
  }, [executions]);

  const stepTotals = useMemo(() => {
    const all = Object.values(stepStats);
    const total = all.reduce((sum, s) => sum + s.total, 0);
    const passed = all.reduce((sum, s) => sum + s.passed, 0);
    const failed = all.reduce((sum, s) => sum + s.failed, 0);
    const blocked = all.reduce((sum, s) => sum + s.blocked, 0);
    const retest = all.reduce((sum, s) => sum + s.retest, 0);
    const notRun = all.reduce((sum, s) => sum + s.notRun, 0);
    const executed = all.reduce((sum, s) => sum + s.executed, 0);
    const progress = total ? Math.round((executed / total) * 100) : 0;
    return { total, passed, failed, blocked, retest, notRun, executed, progress, hasSteps: total > 0 };
  }, [stepStats]);

  const setDraft = (execId: string, patch: Partial<Draft>) => { setDrafts((prev) => ({ ...prev, [execId]: { ...prev[execId], ...patch } as Draft })); };

  const saveExecution = async (exec: Execution) => {
    if (isCompleted) return;
    const draft = drafts[exec.id];
    if (!draft) return;
    setSavingId(exec.id);
    setError('');
    try {
      const res = await fetch(`/api/test-executions/${exec.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: draft.status, actual_result: draft.actual_result, comments: draft.comments }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save execution.');
      await loadExecutions();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save execution.'); }
    finally { setSavingId(null); }
  };

  const bulkSet = async (status: 'passed' | 'failed') => {
    if (isCompleted || !filtered.length) return;
    setBulkSaving(true);
    setError('');
    try {
      for (const exec of filtered) {
        const draft = drafts[exec.id];
        const res = await fetch(`/api/test-executions/${exec.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, actual_result: draft?.actual_result ?? exec.actual_result ?? '', comments: draft?.comments ?? exec.comments ?? '' }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Could not update ${getCaseKey(exec)}.`);
      }
      await loadExecutions();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not bulk update.'); }
    finally { setBulkSaving(false); }
  };

  const toggleComplete = async () => {
    if (!run) return;
    const nextStatus = isCompleted ? 'in_progress' : 'completed';
    setCompleting(true);
    setError('');
    try {
      const res = await fetch(`/api/test-runs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update test run.');
      setRun((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update test run.'); }
    finally { setCompleting(false); }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors dark:bg-[#101622]"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 overflow-y-auto p-6"><p className="text-xs text-slate-500 dark:text-slate-400">Loading test run…</p></main></div></div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <Link href="/test-runs" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to Test Runs</Link>
            <span>/</span><span className="text-slate-800 dark:text-slate-200 font-medium truncate">{run?.name}</span>
          </div>

          <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">{run?.name}</h1>
                  <span className={`text- font-semibold px-2 py-0.5 rounded-full border ${statusBadge(run?.status ?? '')}`}>{run?.status === 'in_progress' ? 'In Progress' : statusLabel(run?.status ?? '')}</span>
                </div>
                {run?.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-wrap">{run.description}</p>}
                {run?.configuration && <p className="text- text-slate-500 dark:text-slate-400 mt-1">Config: {run.configuration}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/test-runs" className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#182232] px-3 py-1.5 rounded">All Runs</Link>
                <button type="button" onClick={() => void toggleComplete()} disabled={completing} className={`text-xs font-semibold px-3 py-1.5 rounded shadow-sm transition-colors disabled:opacity-50 ${isCompleted ? 'bg-[#276fbf] hover:bg-[#1e5aa8] text-white' : 'bg-[#48a43f] hover:bg-[#3c8b34] text-white'}`}>{completing ? 'Saving…' : isCompleted ? 'Reopen Run' : 'Complete Run'}</button>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-700 dark:text-slate-300">Cases:</span> {counts.passed} passed • {counts.failed} failed • {counts.blocked} blocked • {counts.retest} retest • {counts.notRun} not run — {counts.total} total</span>
              </div>
              {stepTotals.hasSteps && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-700 dark:text-slate-300">Steps:</span> {stepTotals.passed} passed • {stepTotals.failed} failed • {stepTotals.blocked} blocked • {stepTotals.retest} retest • {stepTotals.notRun} not run — {stepTotals.total} total • {stepTotals.executed} decided</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{stepTotals.progress}% steps decided ({stepTotals.executed} / {stepTotals.total})</span>
                </div>
              )}
              {!stepTotals.hasSteps && (
                <div className="flex justify-end text-xs"><span className="font-semibold text-slate-700 dark:text-slate-300">{counts.caseProgress}% executed</span></div>
              )}
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="h-full bg-[#48a43f] rounded-full transition-all" style={{ width: `${stepTotals.hasSteps ? stepTotals.progress : counts.caseProgress}%` }} />
              </div>
            </div>
          </div>

          {isCompleted && (<div className="mb-4 p-3 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded-md font-medium">This run is completed — results are read-only. Click Reopen Run to edit again.</div>)}
          {error && (<div role="alert" className="mb-4 p-3 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-md font-medium">{error}</div>)}

          <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-3 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex flex-wrap gap-1">
                {FILTERS.map((f) => (<button key={f.value} type="button" onClick={() => setStatusFilter(f.value)} className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${statusFilter === f.value ? 'bg-[#276fbf] text-white border-[#276fbf]' : 'bg-white dark:bg-[#182232] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{f.label}</button>))}
              </div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by key or title…" className="flex-1 min-w- rounded border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" />
              <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }} className="text-xs font-medium text-[#276fbf] dark:text-[#4da3ff] hover:underline shrink-0">Clear</button>
              <div className="flex gap-2 shrink-0">
                <button type="button" disabled={bulkSaving || isCompleted || !filtered.length} onClick={() => void bulkSet('passed')} className="text-xs font-semibold bg-[#48a43f] hover:bg-[#3c8b34] text-white px-3 py-1.5 rounded disabled:opacity-50">{bulkSaving ? 'Saving…' : 'Mark Filtered Passed'}</button>
                <button type="button" disabled={bulkSaving || isCompleted || !filtered.length} onClick={() => void bulkSet('failed')} className="text-xs font-semibold bg-[#a94442] hover:bg-[#8d3a38] text-white px-3 py-1.5 rounded disabled:opacity-50">{bulkSaving ? 'Saving…' : 'Mark Filtered Failed'}</button>
              </div>
            </div>
            <p className="text- text-slate-500 dark:text-slate-400 mt-2">Showing {filtered.length} of {counts.total} executions</p>
          </div>

          <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-8 text-center"><p className="text-xs text-slate-500 dark:text-slate-400">No executions match this filter.</p><Link href="/test-runs/new" className="mt-3 inline-block text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:underline">+ Create a test run</Link></div>
            ) : (
              <ul className="divide-y divide-[#edf2f7] dark:divide-[#222e3e]">
                {filtered.map((exec) => {
                  const draft = drafts[exec.id] ?? { status: exec.status, actual_result: exec.actual_result ?? '', comments: exec.comments ?? '' };
                  const isExpanded = expandedId === exec.id;
                  return (
                    <li key={exec.id}>
                      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-[#1f2c3f]">
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : exec.id)} className="shrink-0 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" aria-label={isExpanded ? 'Collapse' : 'Expand'}>{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : exec.id)} className="flex-1 min-w-0 text-left"><span className="font-mono text-xs font-bold text-[#276fbf] dark:text-[#4da3ff]">{getCaseKey(exec)}</span><span className="text-xs text-slate-800 dark:text-slate-200 ml-2 truncate inline-block max-w- align-middle">{getTitle(exec)}</span></button>
                        <span className={`shrink-0 text- font-semibold px-2 py-0.5 rounded-full border ${statusBadge(exec.status)}`}>{statusLabel(exec.status)}</span>
                        {exec.executed_at && (<span className="hidden lg:block text- text-slate-400 dark:text-slate-500 shrink-0">{new Date(exec.executed_at).toLocaleDateString()}</span>)}
                      </div>
                      {isExpanded && (
                        <div className="border-t border-[#e2e8f0] dark:border-[#28374d] bg-[#fcfcfc] dark:bg-[#101622]">
                          {getPreconditions(exec) && (<div className="px-3 pt-3"><p className="text- font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Preconditions</p><p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{getPreconditions(exec)}</p></div>)}
                          {getDescription(exec) && (<div className="px-3 pt-3"><p className="text- font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</p><p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{getDescription(exec)}</p></div>)}
                          <div className="px-3 pt-3"><div className="border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden bg-white dark:bg-[#182232]"><StepExecutionPanel executionId={exec.id} onChanged={handleStepChanged} /></div></div>
                          <div className="px-3 py-3 space-y-3">
                            <div>
                              <p className="text- font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Overall Result</p>
                              <div className="flex flex-wrap gap-1.5">{(['passed', 'failed', 'blocked', 'retest', 'not_run'] as const).map((s) => (<button key={s} type="button" disabled={isCompleted} onClick={() => setDraft(exec.id, { status: s })} className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors disabled:opacity-50 ${draft.status === s ? 'bg-[#276fbf] text-white border-[#276fbf]' : 'bg-white dark:bg-[#182232] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{statusLabel(s)}</button>))}</div>
                              {stepStats[exec.id] && (<p className="text- text-slate-500 dark:text-slate-400 mt-1">This case has steps — overall is derived from steps. Manual selection here is ignored on save.</p>)}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div><label className="block text- font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Actual Result — whole case</label><textarea value={draft.actual_result} disabled={isCompleted} onChange={(e) => setDraft(exec.id, { actual_result: e.target.value })} rows={3} placeholder="Overall: what happened for the whole case — e.g. Logged in, dashboard loaded. Leave empty if steps already say it." className="w-full rounded border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] px-2.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf] disabled:opacity-60" /></div>
                              <div><label className="block text- font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Comments</label><textarea value={draft.comments} disabled={isCompleted} onChange={(e) => setDraft(exec.id, { comments: e.target.value })} rows={3} placeholder="Notes, environment, links…" className="w-full rounded border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] px-2.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf] disabled:opacity-60" /></div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {!isCompleted && (<button type="button" disabled={savingId === exec.id} onClick={() => void saveExecution(exec)} className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-1.5 rounded shadow-sm disabled:opacity-50">{savingId === exec.id ? 'Saving…' : 'Save Overall Result'}</button>)}
                              <button type="button" onClick={() => router.push(`/defects/new?testCaseId=${exec.test_case_id}&testExecutionId=${exec.id}&summary=${encodeURIComponent(`${getCaseKey(exec)} — ${getTitle(exec)}`)}`)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a94442] dark:text-[#ff7875] border border-[#ebccd1] dark:border-[#521e24] bg-[#f2dede] dark:bg-[#34161a] px-3 py-1.5 rounded hover:bg-[#e8d5d5] dark:hover:bg-[#421d1d]"><Bug className="w-3.5 h-3.5" /> Create Defect from Failure</button>
                              <span className="text- text-slate-400 dark:text-slate-500">Tip: marking a step Failed auto-flips the overall result to Failed. Marking all steps Passed flips it to Passed.</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><PlayCircle className="w-3.5 h-3.5" /><span>Expand a case to execute it step-by-step. Cases with no steps still work with overall Pass / Fail only.</span></div>
        </main>
      </div>
    </div>
  );
}