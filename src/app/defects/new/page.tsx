'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArrowLeft, Bug, Plus } from 'lucide-react';

export default function NewDefectPage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [form, setForm] = useState({ defectKey: '', summary: '', description: '', severity: 'major', priority: 'medium', environment: '', expectedResult: '', actualResult: '' });
  const [reproSteps, setReproSteps] = useState<string[]>(['']);
  const [showStepConfirm, setShowStepConfirm] = useState(false);
  const [stepToRemove, setStepToRemove] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const confirmRemoveStep = () => {
    if (stepToRemove !== null) setReproSteps(reproSteps.filter((_, j) => j !== stepToRemove));
    setShowStepConfirm(false);
    setStepToRemove(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) { setError('Select a project first.'); return; }
    setSaving(true); setError('');
    try {
      const stepsToReproduce = reproSteps.map((s) => s.trim()).filter(Boolean).join('\n');
      const res = await fetch('/api/defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          project_id: project.id,
          defectKey: form.defectKey,
          defect_key: form.defectKey,
          summary: form.summary,
          description: form.description,
          severity: form.severity,
          priority: form.priority,
          environment: form.environment,
          stepsToReproduce,
          steps_to_reproduce: stepsToReproduce,
          expectedResult: form.expectedResult,
          expected_result: form.expectedResult,
          actualResult: form.actualResult,
          actual_result: form.actualResult,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create defect.');
      router.push('/defects');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create defect.'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]';
  const selectCls = inputCls + ' dark:[color-scheme:dark]';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-700 dark:text-slate-300';

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
              <Link href="/defects" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to Defects</Link>
              <span>/</span><span className="font-medium text-slate-700 dark:text-slate-200">Add Defect</span>
            </div>
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
              <div className="bg-[#f8fafc] dark:bg-[#141d28] px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center"><Bug className="w-4 h-4" /></div>
                <div><h1 className="dark:text-white text-base font-bold text-slate-900 tracking-tight">Report Defect</h1><p className="text-xs text-slate-500 dark:text-slate-400">Record an issue, steps to reproduce, and impact details</p></div>
              </div>
              <div className="p-6">
                {error && <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
                <form onSubmit={submit} className="space-y-5">
                  <div><label className={labelCls}>Target Project <span className="text-red-500">*</span></label><ProjectSelector value={project?.id ?? ''} onChange={setProject} /></div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Defect Key</label><input value={form.defectKey} onChange={(e) => setForm({ ...form, defectKey: e.target.value })} placeholder="e.g. BUG-101 (leave empty to auto-generate)" className={inputCls} /></div>
                    <div><label className={labelCls}>Summary <span className="text-red-500">*</span></label><input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="e.g. Session expires immediately when switching tabs" required className={inputCls} /></div>
                  </div>
                  <div><label className={labelCls}>Description / Overview</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="High level overview of what broke and under what circumstances" className={inputCls} /></div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Severity</label><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={selectCls}>{['trivial', 'minor', 'major', 'critical', 'blocker'].map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
                    <div><label className={labelCls}>Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selectCls}>{['low', 'medium', 'high', 'critical'].map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
                    <div><label className={labelCls}>Environment</label><input value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} placeholder="e.g. Staging / iOS 17 Safari" className={inputCls} /></div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className={labelCls + ' mb-0'}>Steps to Reproduce</span>
                      <button type="button" onClick={() => setReproSteps([...reproSteps, ''])} className="text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Step</button>
                    </div>
                    {reproSteps.map((step, i) => (
                      <div key={i} className="grid sm:grid-cols-[2rem_1fr_auto] gap-2 mb-2 items-start">
                        <span className="text-xs font-bold pt-2">{i + 1}.</span>
                        <textarea value={step} onChange={(e) => setReproSteps(reproSteps.map((x, j) => j === i ? e.target.value : x))} rows={2} placeholder="Describe this step..." className="border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded font-normal px-2 py-1.5 text-xs text-slate-900 dark:text-white" />
                        <button type="button" onClick={() => { setStepToRemove(i); setShowStepConfirm(true); }} className="text-red-500 text-xs pt-2">Remove</button>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Expected Result</label><textarea value={form.expectedResult} onChange={(e) => setForm({ ...form, expectedResult: e.target.value })} rows={2} placeholder="What should have happened" className={inputCls} /></div>
                    <div><label className={labelCls}>Actual Result</label><textarea value={form.actualResult} onChange={(e) => setForm({ ...form, actualResult: e.target.value })} rows={2} placeholder="What actually occurred" className={inputCls} /></div>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-[#e2e8f0] dark:border-[#28374d]">
                    <button disabled={saving} className="bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm">{saving ? 'Saving...' : 'Add Defect'}</button>
                    <Link href="/defects" className="border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#182232] text-slate-700 dark:text-slate-200 text-xs font-normal px-4 py-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <ConfirmDialog open={showStepConfirm} title="Remove this step?" message={stepToRemove !== null ? `Remove Step ${stepToRemove + 1}?` : 'Remove this step?'} confirmLabel="Remove step" deleting={false} onConfirm={confirmRemoveStep} onCancel={() => { setShowStepConfirm(false); setStepToRemove(null); }} />
        </main>
      </div>
    </div>
  );
}