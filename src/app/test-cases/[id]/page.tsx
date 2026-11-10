'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

type Step = { action: string; expectedResult: string };

const inputCls =
  'w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#276fbf]';
const stepInputCls =
  'border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#276fbf]';
const labelCls = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

export default function TestCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [tc, setTc] = useState<any>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [form, setForm] = useState({ title: '', description: '', preconditions: '', priority: 'medium', testType: 'functional', category: 'General', automationStatus: 'manual', tags: '' });
  const [requirements, setRequirements] = useState<any[]>([]);
  const [selectedReqs, setSelectedReqs] = useState<string[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Step-remove confirmation — only this is new
  const [stepToRemove, setStepToRemove] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/test-cases/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load test case.');
        setTc(data.testCase);
        setSteps((data.steps ?? []).map((s: any) => ({ action: s.action, expectedResult: s.expected_result })));
        setRecent(data.recentExecutions ?? []);
        setForm({
          title: data.testCase.title ?? '',
          description: data.testCase.description ?? '',
          preconditions: data.testCase.preconditions ?? '',
          priority: data.testCase.priority ?? 'medium',
          testType: data.testCase.test_type ?? 'functional',
          category: data.testCase.category ?? 'General',
          automationStatus: data.testCase.automation_status ?? 'manual',
          tags: (data.testCase.tags ?? []).join(', '),
        });
        setSelectedReqs((data.requirements ?? []).map((r: any) => r.id));
        const rr = await fetch(`/api/requirements?projectId=${data.testCase.project_id}`, { cache: 'no-store' });
        const rd = await rr.json();
        if (rr.ok) setRequirements(rd.requirements ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load test case.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`/api/test-cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          testType: form.testType,
          automationStatus: form.automationStatus,
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
          steps,
          requirementIds: selectedReqs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setTc(data.testCase);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/test-cases/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not delete.');
        setShowDeleteConfirm(false);
        return;
      }
      router.push('/test-cases');
    } finally {
      setDeleting(false);
    }
  };

  const confirmRemoveStep = () => {
    if (stepToRemove !== null) {
      setSteps(steps.filter((_, j) => j !== stepToRemove));
    }
    setStepToRemove(null);
  };

  if (loading)
    return (
      <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622]">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 p-6 text-xs text-slate-500 dark:text-slate-400">Loading...</main>
        </div>
      </div>
    );

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
              <Link href="/test-cases" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Test Cases
              </Link>
              <span>/</span>
              <span className="font-medium">{tc?.case_key}</span>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
            {saved && <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">Saved.</div>}
            {tc && (
              <form onSubmit={save} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <div className="bg-[#f8fafc] dark:bg-[#1e2a3a] px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#276fbf] dark:text-[#4da3ff] bg-[#eef5fc] dark:bg-[#1e2a3a] border border-[#d8dee4] dark:border-[#28374d] px-2 py-1 rounded">{tc.case_key}</span>
                    <h1 className="text-lg font-bold mt-2 text-slate-900 dark:text-white">{tc.title}</h1>
                  </div>
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-600 dark:text-red-400 font-semibold inline-flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div>
                    <label className={labelCls}>Title *</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputCls} />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Priority</label>
                      <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                        {['low', 'medium', 'high', 'critical'].map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Type</label>
                      <select value={form.testType} onChange={(e) => setForm({ ...form, testType: e.target.value })} className={inputCls}>
                        {['functional', 'regression', 'integration', 'system', 'api', 'ui', 'performance', 'security', 'exploratory', 'uat'].map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Automation</label>
                      <select value={form.automationStatus} onChange={(e) => setForm({ ...form, automationStatus: e.target.value })} className={inputCls}>
                        {['manual', 'automated', 'to_automate', 'not_automatable'].map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Category</label>
                    <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Preconditions</label>
                    <textarea value={form.preconditions} onChange={(e) => setForm({ ...form, preconditions: e.target.value })} rows={2} className={`${inputCls} resize-y`} />
                  </div>
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputCls} resize-y`} />
                  </div>

                  {/* STEPS — restored, full row: number + action + expected + Remove */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Steps (structured — replaces free-text steps)</h3>
                      <button type="button" onClick={() => setSteps([...steps, { action: '', expectedResult: '' }])} className="text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] inline-flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Add Step
                      </button>
                    </div>
                    {steps.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500">No steps yet. Add steps to make this case executable step-by-step.</p>}
                    {steps.map((s, i) => (
                      <div key={i} className="grid sm:grid-cols-[2rem_1fr_1fr_auto] gap-2 mb-2 items-start">
                        <span className="text-xs font-bold pt-2 text-slate-700 dark:text-slate-300">{i + 1}.</span>
                        <textarea
                          value={s.action}
                          onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, action: e.target.value } : x)))}
                          rows={2}
                          placeholder="Action"
                          className={`${stepInputCls} resize-y`}
                        />
                        <textarea
                          value={s.expectedResult}
                          onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, expectedResult: e.target.value } : x)))}
                          rows={2}
                          placeholder="Expected result"
                          className={`${stepInputCls} resize-y`}
                        />
                        <button type="button" onClick={() => setStepToRemove(i)} className="text-red-500 dark:text-red-400 text-xs pt-2">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Linked Requirements</h3>
                    <div className="max-h-40 overflow-y-auto border border-[#d8dee4] dark:border-[#28374d] rounded p-2 space-y-1 bg-white dark:bg-[#101622]">
                      {requirements.length === 0 && <p className="text-xs text-slate-400">No requirements in this project.</p>}
                      {requirements.map((r: any) => (
                        <label key={r.id} className="flex gap-2 text-xs text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={selectedReqs.includes(r.id)}
                            onChange={(e) => setSelectedReqs(e.target.checked ? [...selectedReqs, r.id] : selectedReqs.filter((x) => x !== r.id))}
                          />
                          <span className="font-mono font-bold">{r.req_key}</span>
                          <span>{r.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Tags (comma-separated)</label>
                    <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputCls} placeholder="login, smoke" />
                  </div>

                  <button disabled={saving} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {recent.length > 0 && (
              <section className="mt-6 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5">
                <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-white">Recent Executions</h3>
                {recent.map((r: any) => (
                  <div key={r.id} className="flex justify-between text-xs py-1.5 border-b border-[#e2e8f0] dark:border-[#28374d] last:border-0">
                    <span className="text-slate-700 dark:text-slate-200">{r.test_runs?.name}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{r.status}</span>
                    <span className="text-slate-400">{r.executed_at ? new Date(r.executed_at).toLocaleString() : '—'}</span>
                  </div>
                ))}
              </section>
            )}
          </div>

          {/* Delete whole test case — unchanged */}
          <ConfirmDialog
            open={showDeleteConfirm}
            title="Delete this test case?"
            message="This will permanently delete this test case and its executions. This cannot be undone."
            confirmLabel="Delete test case"
            deleting={deleting}
            onConfirm={remove}
            onCancel={() => setShowDeleteConfirm(false)}
          />

          {/* Remove one step — new, only this dialog is new */}
          <ConfirmDialog
            open={stepToRemove !== null}
            title="Remove this step?"
            message={
              stepToRemove !== null
                ? `This will remove Step ${stepToRemove + 1} — “${steps[stepToRemove]?.action || 'Untitled step'}”. You can still undo by not saving. It is only permanently gone after you click Save Changes.`
                : ''
            }
            confirmLabel="Remove step"
            onConfirm={confirmRemoveStep}
            onCancel={() => setStepToRemove(null)}
          />
        </main>
      </div>
    </div>
  );
}