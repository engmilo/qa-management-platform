'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type StepStatus = 'passed' | 'failed' | 'blocked' | 'retest' | 'not_run' | 'untested';

type Step = {
  step_number: number;
  action: string;
  expected_result: string;
  execution_step_id: string | null;
  status: StepStatus;
  actual_result: string;
};

export type StepChangedUpdate = {
  executionId: string;
  derivedStatus: string;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  retest: number;
  notRun: number;
  executed: number;
};

const STATUS_BUTTONS: { value: StepStatus; label: string; activeClass: string }[] = [
  { value: 'passed', label: 'Passed', activeClass: 'bg-[#48a43f] text-white border-[#48a43f]' },
  { value: 'failed', label: 'Failed', activeClass: 'bg-[#a94442] text-white border-[#a94442]' },
  { value: 'blocked', label: 'Blocked', activeClass: 'bg-[#8a6d3b] text-white border-[#8a6d3b]' },
  { value: 'retest', label: 'Retest', activeClass: 'bg-[#7e22ce] text-white border-[#7e22ce]' },
  { value: 'not_run', label: 'Not Run', activeClass: 'bg-slate-600 text-white border-slate-600' },
];

function breakdown(list: Step[]) {
  return {
    passed: list.filter((s) => s.status === 'passed').length,
    failed: list.filter((s) => s.status === 'failed').length,
    blocked: list.filter((s) => s.status === 'blocked').length,
    retest: list.filter((s) => s.status === 'retest').length,
    notRun: list.filter((s) => s.status === 'not_run' || s.status === 'untested').length,
    executed: list.filter((s) => s.status !== 'not_run' && s.status !== 'untested').length,
  };
}

export function StepExecutionPanel({ executionId, onChanged }: { executionId: string; onChanged?: (u: StepChangedUpdate) => void }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [testCaseId, setTestCaseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingStep, setSavingStep] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const report = useCallback((list: Step[], derivedStatus?: string) => {
    if (!onChanged) return;
    const b = breakdown(list);
    onChanged({ executionId, derivedStatus: derivedStatus ?? '', total: list.length, ...b });
  }, [executionId, onChanged]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/test-executions/${executionId}/steps`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load steps.');
      if (data.syncError) throw new Error(`Step loaded but case status could not sync: ${data.syncError}`);
      const list: Step[] = data.steps ?? [];
      setSteps(list);
      setTestCaseId(data.execution?.test_case_id ?? '');
      setDrafts(Object.fromEntries(list.map((s) => [s.step_number, s.actual_result ?? ''])));
      report(list, data.derivedStatus ?? data.execution?.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load steps.');
    } finally {
      setLoading(false);
    }
  }, [executionId, report]);

  useEffect(() => { void load(); }, [load]);

  const saveStep = async (step: Step, nextStatus: StepStatus, nextActual: string) => {
    setSavingStep(step.step_number);
    setError('');
    try {
      const res = await fetch(`/api/test-executions/${executionId}/steps`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepNumber: step.step_number, status: nextStatus, actualResult: nextActual }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save step.');
      const list: Step[] = data.steps ?? steps.map((s) => s.step_number === step.step_number ? { ...s, status: nextStatus, actual_result: nextActual } : s);
      setSteps(list);
      setDrafts((d) => ({ ...d, [step.step_number]: nextActual }));
      report(list, data.derivedStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save step.');
    } finally {
      setSavingStep(null);
    }
  };

  if (loading) return <p className="text-xs text-slate-500 dark:text-slate-400 px-3 py-2">Loading steps…</p>;
  if (error) return <p role="alert" className="text-xs text-red-600 dark:text-red-400 px-3 py-2">{error}</p>;
  if (!steps.length) {
    return (
      <div className="px-3 py-2 border-t border-[#e2e8f0] dark:border-[#28374d] flex flex-wrap items-center gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">No steps defined for this test case — steps are stored in the test case, not in the description text.</p>
        {testCaseId && (<Link href={`/test-cases/${testCaseId}`} className="text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:underline">Add steps in test case →</Link>)}
      </div>
    );
  }

  const b = breakdown(steps);
  const firstFailed = steps.find((s) => s.status === 'failed');
  const firstBlocked = steps.find((s) => s.status === 'blocked');
  const firstRetest = steps.find((s) => s.status === 'retest');

  return (
    <div className="border-t border-[#e2e8f0] dark:border-[#28374d]">
      <div className="flex items-center justify-between px-3 py-2 bg-[#f8fafc] dark:bg-[#141d28]">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Steps — {b.passed} passed • {b.failed} failed • {b.blocked} blocked • {b.retest} retest • {b.notRun} not run — {steps.length} total
        </p>
        <p className="text- text-slate-500 dark:text-slate-400">Priority: Failed &gt; Blocked &gt; Retest &gt; Passed / Not Run</p>
      </div>
      {firstFailed && <p className="px-3 py-1.5 text- bg-[#f2dede] dark:bg-[#34161a] text-[#a94442] dark:text-[#ff7875]">Overall is Failed because Step {firstFailed.step_number} is Failed.</p>}
      {!firstFailed && firstBlocked && <p className="px-3 py-1.5 text- bg-[#fcf8e3] dark:bg-[#332711] text-[#8a6d3b] dark:text-[#faad14]">Overall is Blocked because Step {firstBlocked.step_number} is Blocked (Blocked outranks Retest).</p>}
      {!firstFailed && !firstBlocked && firstRetest && <p className="px-3 py-1.5 text- bg-[#f3e8ff] dark:bg-[#281639] text-[#7e22ce] dark:text-[#d3adf7]">Overall is Retest because Step {firstRetest.step_number} is Retest and no step is Failed / Blocked.</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white dark:bg-[#182232] text-left text- uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-[#e2e8f0] dark:border-[#28374d]">
              <th className="px-3 py-2 font-semibold w-10">#</th>
              <th className="px-3 py-2 font-semibold">Action</th>
              <th className="px-3 py-2 font-semibold">Expected Result</th>
              <th className="px-3 py-2 font-semibold w-56">Status — click to set</th>
              <th className="px-3 py-2 font-semibold w-56">Actual Result — this step only</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step) => (
              <tr key={step.step_number} className="border-b border-[#edf2f7] dark:border-[#222e3e] align-top">
                <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">{step.step_number}</td>
                <td className="px-3 py-2 text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{step.action}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{step.expected_result}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {STATUS_BUTTONS.map((btn) => (
                      <button
                        key={btn.value}
                        type="button"
                        disabled={savingStep === step.step_number}
                        onClick={() => void saveStep(step, btn.value, drafts[step.step_number] ?? '')}
                        className={`px-2 py-0.5 rounded border text- font-normal transition-colors disabled:opacity-50 ${step.status === btn.value ? btn.activeClass : 'bg-white dark:bg-[#182232] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <textarea
                    value={drafts[step.step_number] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [step.step_number]: e.target.value }))}
                    rows={2}
                    placeholder="What happened on this step…"
                    className="w-full rounded font-normal border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#48a43f]"
                  />
                  <button
                    type="button"
                    disabled={savingStep === step.step_number || (drafts[step.step_number] ?? '') === (step.actual_result ?? '')}
                    onClick={() => void saveStep(step, step.status, drafts[step.step_number] ?? '')}
                    className="mt-1 text- font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    {savingStep === step.step_number ? 'Saving…' : 'Save actual result'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}