"use client";
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArrowLeft, Trash2, Bug } from 'lucide-react';
import { AutoGrowTextarea } from '@/components/ui/auto-grow-textarea';

export default function DefectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [defect, setDefect] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showStepConfirm, setShowStepConfirm] = useState(false);
  const [stepToRemove, setStepToRemove] = useState<number | null>(null);
  const [form, setForm] = useState({
    summary: '', description: '', severity: 'major', priority: 'medium', status: 'new',
    environment: '', expectedResult: '', actualResult: '',
  });
  const [steps, setSteps] = useState<string[]>([]);

  const parseDefectSteps = (d: any): string[] => {
    const raw = d?.steps ?? d?.steps_to_reproduce ?? '';
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string' && raw.trim()) {
      return raw.split('\n').map((s: string) => s.trim()).filter(Boolean).map((s: string) => s.replace(/^\d+[.)]\s*/, ''));
    }
    return [];
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/defects/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load defect.');
        setDefect(data.defect);
        setForm({
          summary: data.defect.summary ?? '',
          description: data.defect.description ?? '',
          severity: data.defect.severity ?? 'major',
          priority: data.defect.priority ?? 'medium',
          status: data.defect.status ?? 'new',
          environment: data.defect.environment ?? '',
          expectedResult: data.defect.expected_result ?? '',
          actualResult: data.defect.actual_result ?? '',
        });
        setSteps(parseDefectSteps(data.defect));
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not load defect.'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const updateStep = (index: number, value: string) => {
    setSteps(steps.map((s, i) => (i === index ? value : s)));
  };
  const addStep = () => setSteps([...steps, '']);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`/api/defects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, steps_to_reproduce: steps.join('\n'), steps }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setDefect(data.defect); setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/defects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not delete.'); setShowDeleteConfirm(false); return; }
      router.push('/defects');
    } finally { setDeleting(false); }
  };

  const confirmRemoveStep = () => {
    if (stepToRemove === null) return;
    setSteps(steps.filter((_, i) => i !== stepToRemove));
    setStepToRemove(null);
    setShowStepConfirm(false);
  };

  if (loading) return <div className="flex h-screen bg-[#f5f7f9]"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 p-6 text-xs">Loading...</main></div></div>;

  const inputCls = "w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf]";
  const labelCls = "block text-xs font-normal mb-1.5";

  return (
    <div className="flex h-screen bg-[#f5f7f9]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <Link href="/defects" className="text-[#276fbf] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Defects</Link>
              <span>/</span><span className="font-medium">{defect?.defect_key}</span>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}
            {saved && <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded text-xs">Saved.</div>}
            {defect && (
              <form id="defect-form" onSubmit={save}>
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                  <div className="bg-[#f8fafc] px-6 py-4 border-b flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#276fbf] bg-[#eef5fc] border px-2 py-1 rounded">{defect.defect_key}</span>
                      <h1 className="text-lg font-bold mt-2">{defect.summary}</h1>
                      <p className="text-xs text-slate-500 mt-1">Created {defect.created_at ? new Date(defect.created_at).toLocaleString() : ''}</p>
                    </div>
                    <button type="button" onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-normal px-3 py-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  </div>
                  <div className="p-6 space-y-5">
                    <div><label className={labelCls}>Summary *</label><input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} required className={inputCls} /></div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div><label className={labelCls}>Severity</label><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={inputCls}>{['trivial','minor','major','critical','blocker'].map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}</select></div>
                      <div><label className={labelCls}>Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>{['low','medium','high','critical'].map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}</select></div>
                      <div><label className={labelCls}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}><option value="new">New</option><option value="open">Open</option><option value="in_progress">In Progress</option><option value="fixed">Fixed</option><option value="ready_for_retest">Ready For Retest</option><option value="closed">Closed</option><option value="rejected">Rejected</option></select></div>
                    </div>
                    <div><label className={labelCls}>Environment</label><input value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} placeholder="Chrome / Windows, iOS 17..." className={inputCls} /></div>
                    <div><label className={labelCls}>Description</label><AutoGrowTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputCls} resize-none overflow-hidden`} /></div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-normal">Steps to Reproduce</label>
                        <button type="button" onClick={addStep} className="text-xs text-[#276fbf] font-semibold">+ Add Step</button>
                      </div>
                      {steps.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">No steps yet. Click + Add Step.</p> : steps.map((step, index) => (
                        <div key={index} className="flex items-start gap-2 mb-2">
                          <span className="text-xs text-slate-500 pt-2 w-4 shrink-0">{index + 1}.</span>
                          <AutoGrowTextarea value={step} onChange={(e) => updateStep(index, e.target.value)} rows={1} placeholder="Step" className={`flex-1 border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf] resize-none overflow-hidden`} />
                          <button type="button" onClick={() => { setStepToRemove(index); setShowStepConfirm(true); }} className="inline-flex items-center justify-center shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-normal text-xs px-3 py-1.5 rounded mt-0.5">Remove</button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelCls}>Expected Result</label><AutoGrowTextarea value={form.expectedResult} onChange={(e) => setForm({ ...form, expectedResult: e.target.value })} rows={1} className={`${inputCls} resize-none overflow-hidden`} /></div>
                      <div><label className={labelCls}>Actual Result</label><AutoGrowTextarea value={form.actualResult} onChange={(e) => setForm({ ...form, actualResult: e.target.value })} rows={1} className={`${inputCls} resize-none overflow-hidden`} /></div>
                    </div>
                  </div>
                </div>
              </form>
            )}
            {defect && (
              <section className="mt-6 bg-white border rounded-md p-5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Bug className="w-4 h-4" /> Linked From Test Execution</h3>
                {defect.test_cases ? (
                  <p className="text-xs">Test case: <Link href={`/test-cases/${defect.test_case_id}`} className="text-[#276fbf] hover:underline font-semibold">{defect.test_cases.case_key} — {defect.test_cases.title}</Link></p>
                ) : <p className="text-xs text-slate-400">No test case linked. Created manually, or from the Defects page.</p>}
                {defect.test_execution_id && <p className="text-xs mt-2 text-slate-500">Execution: <span className="font-mono">{String(defect.test_execution_id).slice(0, 8)}</span> · Status: {defect.test_executions?.status ?? '—'}</p>}
                {!defect.test_execution_id && defect.test_cases && <p className="text-xs mt-2 text-slate-400">No execution linked.</p>}
              </section>
            )}
            {defect && (
              <button type="submit" form="defect-form" disabled={saving} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-normal py-2 rounded mt-4">{saving ? 'Saving...' : 'Save Changes'}</button>
            )}
          </div>
          <ConfirmDialog open={showDeleteConfirm} title="Delete this defect?" message="This will permanently delete this defect. This cannot be undone." confirmLabel="Delete defect" deleting={deleting} onConfirm={remove} onCancel={() => setShowDeleteConfirm(false)} />
          <ConfirmDialog open={showStepConfirm} title="Remove this step?" message="This will remove this step from Steps to Reproduce." confirmLabel="Remove step" onConfirm={confirmRemoveStep} onCancel={() => { setShowStepConfirm(false); setStepToRemove(null); }} />
        </main>
      </div>
    </div>
  );
}
