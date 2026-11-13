"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type Exec = { id: string; test_case_id: string; test_run_id: string; status: string; test_case?: any };
type StepRow = { step_number: number; action: string; expected_result: string; status: string; actual_result: string; comments: string; test_case_step_id: string | null };

export default function TestRunDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<any>(null);
  const [execs, setExecs] = useState<Exec[]>([]);
  const [caseById, setCaseById] = useState<Record<string, any>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [stepsByExec, setStepsByExec] = useState<Record<string, StepRow[]>>({});
  const [loadingSteps, setLoadingSteps] = useState<Record<string, boolean>>({});
  const [savingSteps, setSavingSteps] = useState<Record<string, boolean>>({});
  const [stepMsg, setStepMsg] = useState<Record<string, string>>({});
  const [showComplete, setShowComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/test-runs/${id}`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      setRun(j.testRun ?? j.run ?? j ?? null);
      setExecs(j.executions ?? j.testExecutions ?? j.execs ?? []);
      // FIX: API does not join test_cases, so fetch them to resolve ID -> TC-001 + title
      try {
        const tcRes = await fetch('/api/test-cases', { cache: 'no-store' });
        const tcJ = await tcRes.json().catch(() => ({}));
        const list = tcJ.testCases ?? tcJ.test_cases ?? tcJ ?? [];
        const map: Record<string, any> = {};
        (Array.isArray(list) ? list : []).forEach((c: any) => { map[String(c.id)] = c; });
        // Also use any already-joined test_case from executions
        (j.executions ?? []).forEach((e: any) => { if (e.test_case) map[String(e.test_case_id)] = e.test_case; });
        setCaseById(map);
      } catch {}
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { if (id) load(); }, [id]);

  const isCompleted = String(run?.status ?? '').toLowerCase() === 'completed';

  const toggleSteps = async (execId: string) => {
    const willOpen = !expanded[execId];
    setExpanded((p) => ({ ...p, [execId]: willOpen }));
    if (!willOpen) return;
    if (stepsByExec[execId]) return;
    setLoadingSteps((p) => ({ ...p, [execId]: true }));
    try {
      const res = await fetch(`/api/test-executions/${execId}/steps`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      setStepsByExec((p) => ({ ...p, [execId]: j.steps ?? [] }));
    } catch { setStepsByExec((p) => ({ ...p, [execId]: [] })); }
    finally { setLoadingSteps((p) => ({ ...p, [execId]: false })); }
  };

  const saveSteps = async (execId: string) => {
    const steps = stepsByExec[execId] ?? [];
    setSavingSteps((p) => ({ ...p, [execId]: true }));
    setStepMsg((p) => ({ ...p, [execId]: '' }));
    try {
      const res = await fetch(`/api/test-executions/${execId}/steps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Save failed');
      setStepMsg((p) => ({ ...p, [execId]: `Saved. Overall: ${j.overall}` }));
      await load();
    } catch (e: any) {
      setStepMsg((p) => ({ ...p, [execId]: e.message || 'Save failed' }));
    } finally { setSavingSteps((p) => ({ ...p, [execId]: false })); }
  };

  const [runMsg, setRunMsg] = useState('');
  const setRunStatus = async (status: string, closeModal = false) => {
    if (status === 'completed') setCompleting(true); else setReopening(true);
    setRunMsg('');
    try {
      let res = await fetch(`/api/test-runs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      // FIX: some APIs use 'active' not 'in_progress' for reopened runs — try fallback
      if (!res.ok && status === 'in_progress') {
        res = await fetch(`/api/test-runs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active' }) });
      }
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Reopen failed — run stayed Completed, steps stay locked.'); }
      if (closeModal) setShowComplete(false);
      await load();
    } catch (e: any) { setRunMsg(e.message || 'Failed'); } finally { setCompleting(false); setReopening(false); }
  };

  const passed = execs.filter((e) => e.status === 'passed').length;
  const failed = execs.filter((e) => e.status === 'failed').length;
  const blocked = execs.filter((e) => e.status === 'blocked').length;
  const notRun = execs.filter((e) => e.status === 'not_run').length;
  const pct = execs.length ? Math.round(((passed + failed + blocked) / execs.length) * 100) : 0;

  const badge = (s: string) => {
    const v = s.toLowerCase();
    if (v === 'passed') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (v === 'failed') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    if (v === 'blocked') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
          <main className="flex-1 overflow-y-auto p-6"><div className="w-full max-w-none"><div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] rounded-md p-4 text-center text-xs font-semibold text-slate-500">Loading test run...</div></div></main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <Link href="/test-runs" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">← Test Runs &amp; Results</Link>
            <div className="flex flex-wrap gap-2 items-start justify-between mt-3">
              <div>
                <h1 className="text-base font-bold text-white tracking-tight text-left m-0">{run?.name ?? 'Test Run'}</h1>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">{run?.project_name ? `${run.project_name} · ` : ''}{run?.created_at ? new Date(run.created_at).toLocaleString() : ''}</p>
              </div>
              <div className="flex gap-2 items-center">{runMsg && <span className="text-xs font-semibold text-red-600">{runMsg}</span>}
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-normal ${isCompleted ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>{run?.status === 'in_progress' ? 'In Progress' : run?.status === 'completed' ? 'Completed' : run?.status ?? ''}</span>
                {!isCompleted && <button onClick={() => setShowComplete(true)} className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1.5">Complete Run</button>}
                {isCompleted && <button onClick={() => setRunStatus('in_progress')} disabled={reopening} className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded px-3 py-1.5 disabled:opacity-50">{reopening ? 'Reopening...' : 'Reopen Run'}</button>}
                <Link href="/test-runs/new" className="text-xs font-normal bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5">+ New Run</Link>
              </div>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-4 mt-4">
              <div className="flex justify-between text-xs font-semibold"><span>Progress</span><span>{passed + failed + blocked} / {execs.length} · {pct}%</span></div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded mt-2 overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${pct}%` }} /></div>
              <p className="text-xs font-semibold mt-2">Assignee: <span className="text-slate-900 dark:text-white">{run?.assignee_name ?? run?.assignee ?? '—'}</span></p>
              <p className="text-xs font-semibold mt-1"><span className="text-green-600 dark:text-green-400">Passed: {passed}</span><span className="text-slate-400 mx-1">·</span><span className="text-red-600 dark:text-red-400">Failed: {failed}</span><span className="text-slate-400 mx-1">·</span><span className="text-amber-600 dark:text-amber-400">Blocked: {blocked}</span><span className="text-slate-400 mx-1">·</span><span className="text-slate-500 dark:text-slate-400">Not Run: {notRun}</span></p>
              {run?.description && <p className="text-xs font-semibold mt-1">{run.description}</p>}
              {isCompleted && <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-2">Run is Completed — click Reopen Run to change results.</p>}
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md overflow-hidden mt-4">
              <h2 className="text-xs font-semibold px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">Execution History — Test Cases</h2>
              <table className="w-full text-xs font-semibold">
                <thead><tr className="bg-slate-50 dark:bg-[#1a2639] text-left text-slate-500 dark:text-slate-400"><th className="px-4 py-2.5">Test Case</th><th className="px-4 py-2.5">Result</th><th className="px-4 py-2.5">Actions</th></tr></thead>
                <tbody>
                  {execs.map((ex) => {
                    const tc = caseById[String(ex.test_case_id)] ?? ex.test_case ?? {};
                    const code = tc.case_key ?? tc.code ?? '';
                    const title = tc.title ?? (code ? '' : ex.test_case_id);
                    const open = !!expanded[ex.id];
                    const steps = stepsByExec[ex.id] ?? [];
                    return (
                      <React.Fragment key={ex.id}>
                        <tr className="border-t border-slate-200 dark:border-slate-700/50 align-top">
                          <td className="px-4 py-3"><Link href={`/test-cases/${ex.test_case_id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{code ? `${code} — ${title || 'Untitled'}` : title}</Link></td>
                          <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${badge(ex.status)}`}>{ex.status === 'not_run' ? 'Not Run' : ex.status === 'passed' ? 'Passed' : ex.status === 'failed' ? 'Failed' : ex.status === 'blocked' ? 'Blocked' : ex.status === 'retest' ? 'Retest' : ex.status}</span></td>
                          <td className="px-4 py-3"><button onClick={() => toggleSteps(ex.id)} className="text-blue-600 dark:text-blue-400 hover:underline">{open ? 'Hide steps ▲' : 'View steps ▼'}</button></td>
                        </tr>
                        {open && (
                          <tr className="border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-[#101622]/50">
                            <td colSpan={3} className="px-4 py-3">
                              {loadingSteps[ex.id] ? <p className="text-slate-500">Loading steps...</p> : steps.length === 0 ? <p className="text-slate-500">No steps defined for this test case. Add steps in Test Cases → {code}.</p> : (
                                <div className="space-y-2">
                                  {steps.map((s, i) => (
                                    <div key={i} className="border border-[#b6c2cf] dark:border-[#28374d] rounded p-3 bg-white dark:bg-[#182232]">
                                      <div className="flex flex-col sm:flex-row sm:items-start gap-2 justify-between">
                                        <p><span className="text-slate-500">Step {s.step_number}:</span> {s.action}</p>
                                        <select disabled={isCompleted} value={s.status} onChange={(e) => { const n = [...steps]; n[i] = { ...n[i], status: e.target.value }; setStepsByExec((p) => ({ ...p, [ex.id]: n })); }} className="text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1">
                                          <option value="not_run">Not Run</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="blocked">Blocked</option><option value="retest">Retest</option>
                                        </select>
                                      </div>
                                      <p className="text-slate-500 mt-1">Expected: {s.expected_result}</p>
                                      <textarea disabled={isCompleted} value={s.actual_result} onChange={(e) => { const n = [...steps]; n[i] = { ...n[i], actual_result: e.target.value }; setStepsByExec((p) => ({ ...p, [ex.id]: n })); }} placeholder="Actual result..." rows={1} style={{ overflow: 'hidden', resize: 'none' }} className="w-full mt-2 text-xs font-normal bg-white dark:bg-[#101622] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5" />
                                    </div>
                                  ))}
                                  {isCompleted ? <p className="text-amber-600 dark:text-amber-400">Run is Completed — dropdowns are locked. Click Reopen Run (top right) first, then the dropdowns will open.</p> : (
                                    <div className="flex gap-2 items-center">
                                      <button onClick={() => saveSteps(ex.id)} disabled={!!savingSteps[ex.id]} className="text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded px-3 py-1.5">{savingSteps[ex.id] ? 'Saving...' : 'Save Steps'}</button>
                                      {stepMsg[ex.id] && <span className="text-slate-600 dark:text-slate-300">{stepMsg[ex.id]}</span>}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {execs.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-500">No executions in this run yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {showComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] rounded-md p-5 w-full max-w-sm">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Complete this run?</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">You can reopen it later to change results.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowComplete(false)} className="flex-1 text-xs font-semibold border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-2">Cancel</button>
              <button onClick={() => setRunStatus('completed', true)} disabled={completing} className="flex-1 text-xs font-semibold bg-green-600 text-white rounded px-3 py-2 disabled:opacity-50">{completing ? 'Completing...' : 'Complete Run'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}