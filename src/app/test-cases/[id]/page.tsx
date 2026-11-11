'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import CommentsSection from '@/components/comments/CommentsSection';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

type Step = { action: string; expectedResult: string };

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
  const [showStepConfirm, setShowStepConfirm] = useState(false);
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
        body: JSON.stringify({ ...form, testType: form.testType, automationStatus: form.automationStatus, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean), steps, requirementIds: selectedReqs }),
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
      if (!res.ok) { setError(data.error || 'Could not delete.'); setShowDeleteConfirm(false); return; }
      router.push('/test-cases');
    } finally {
      setDeleting(false);
    }
  };

  const confirmRemoveStep = () => {
    if (stepToRemove !== null) setSteps(steps.filter((_, j) => j !== stepToRemove));
    setShowStepConfirm(false);
    setStepToRemove(null);
  };

  if (loading) return <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622]"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 p-6 text-xs">Loading...</main></div></div>;

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
              <Link href="/test-cases" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Test Cases</Link>
              <span>/</span>
              <span className="font-medium">{tc?.case_key}</span>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
            {saved && <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">Saved.</div>}

            {tc && (
              <form onSubmit={save} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <div className="bg-[#f8fafc] dark:bg-[#141d28] px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#276fbf] dark:text-[#4da3ff] bg-[#eef5fc] dark:bg-[#1a2a3a] border border-[#d8dee4] dark:border-[#28374d] px-2 py-1 rounded">{tc.case_key}</span>
                    <h1 className="text-lg font-bold mt-2 text-slate-900 dark:text-white">{tc.title}</h1>
                  </div>
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-600 dark:text-red-400 font-semibold inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Title *</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Priority</label>
                      <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white">{['low', 'medium', 'high', 'critical'].map((v) => <option key={v} value={v}>{v}</option>)}</select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Type</label>
                      <select value={form.testType} onChange={(e) => setForm({ ...form, testType: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white">{['functional', 'regression', 'integration', 'system', 'api', 'ui', 'performance', 'security', 'exploratory', 'uat'].map((v) => <option key={v} value={v}>{v}</option>)}</select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">Automation</label>
                      <select value={form.automationStatus} onChange={(e) => setForm({ ...form, automationStatus: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white">{['manual', 'automated', 'to_automate', 'not_automatable'].map((v) => <option key={v} value={v}>{v}</option>)}</select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Category</label>
                    <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Preconditions</label>
                    <textarea value={form.preconditions} onChange={(e) => setForm({ ...form, preconditions: e.target.value })} rows={2} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Description</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Steps (structured — replaces free-text steps)</h3>
                      <button type="button" onClick={() => setSteps([...steps, { action: '', expectedResult: '' }])} className="text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Step</button>
                    </div>
                    {steps.length === 0 && <p className="text-xs text-slate-400">No steps yet. Add steps to make this case executable step-by-step.</p>}
                    {steps.map((s, i) => (
                      <div key={i} className="grid sm:grid-cols-[2rem_1fr_1fr_auto] gap-2 mb-2 items-start">
                        <span className="text-xs font-bold pt-2">{i + 1}.</span>
                        <textarea value={s.action} onChange={(e) => setSteps(steps.map((x, j) => j === i ? { ...x, action: e.target.value } : x))} rows={2} placeholder="Action" className="border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white" />
                        <textarea value={s.expectedResult} onChange={(e) => setSteps(steps.map((x, j) => j === i ? { ...x, expectedResult: e.target.value } : x))} rows={2} placeholder="Expected result" className="border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-2 py-1.5 text-xs text-slate-900 dark:text-white" />
                        <button type="button" onClick={() => { setStepToRemove(i); setShowStepConfirm(true); }} className="text-red-500 text-xs pt-2">Remove</button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Linked Requirements</h3>
                    <div className="max-h-40 overflow-y-auto border border-[#d8dee4] dark:border-[#28374d] rounded p-2 space-y-1">
                      {requirements.length === 0 && <p className="text-xs text-slate-400">No requirements in this project.</p>}
                      {requirements.map((r: any) => (
                        <label key={r.id} className="flex gap-2 text-xs">
                          <input type="checkbox" checked={selectedReqs.includes(r.id)} onChange={(e) => setSelectedReqs(e.target.checked ? [...selectedReqs, r.id] : selectedReqs.filter((x) => x !== r.id))} />
                          <span className="font-mono font-bold">{r.req_key}</span>
                          <span>{r.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Tags (comma-separated)</label>
                    <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white" placeholder="login, smoke" />
                  </div>
                  <button disabled={saving} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded">{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            )}

            {recent.length > 0 && (
              <section className="mt-6 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5">
                <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-white">Recent Executions</h3>
                {recent.map((r: any) => (
                  <div key={r.id} className="grid grid-cols-[1fr_90px_140px] items-center gap-2 py-1.5 border-b border-[#e2e8f0] dark:border-[#28374d] last:border-0 text-xs">
                    <span className="truncate">{r.test_runs?.name}</span>
                    <span className="text-center font-semibold">{r.status}</span>
                    <span className="text-right text-slate-400">{r.executed_at ? new Date(r.executed_at).toLocaleString() : '—'}</span>
                  </div>
                ))}
              </section>
            )}

            <CommentsSection entityType="test_case" entityId={id} />
          </div>
          <ConfirmDialog open={showDeleteConfirm} title="Delete this test case?" message="This will permanently delete this test case and its executions. This cannot be undone." confirmLabel="Delete test case" deleting={deleting} onConfirm={remove} onCancel={() => setShowDeleteConfirm(false)} />
          <ConfirmDialog open={showStepConfirm} title="Remove this step?" message={stepToRemove !== null ? `Remove Step ${stepToRemove + 1}? This will remove it from the list. Save to keep the change.` : 'Remove this step?'} confirmLabel="Remove step" deleting={false} onConfirm={confirmRemoveStep} onCancel={() => { setShowStepConfirm(false); setStepToRemove(null); }} />
        </main>
      </div>
    </div>
  );
}