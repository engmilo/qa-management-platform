'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArrowLeft, Trash2, Bug } from 'lucide-react';

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
  const [form, setForm] = useState({
    summary: '', description: '', severity: 'major', priority: 'medium', status: 'new',
    environment: '', stepsToReproduce: '', expectedResult: '', actualResult: '',
  });

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
          stepsToReproduce: data.defect.steps_to_reproduce ?? '',
          expectedResult: data.defect.expected_result ?? '',
          actualResult: data.defect.actual_result ?? '',
        });
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not load defect.'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`/api/defects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
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

  if (loading) return <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 p-6 text-xs">Loading...</main></div></div>;

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header />
      <main className="flex-1 overflow-y-auto p-6"><div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/defects" className="text-[#276fbf] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Defects</Link>
          <span>/</span><span className="font-medium">{defect?.defect_key}</span>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
        {saved && <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded text-xs">Saved.</div>}
        {defect && (
          <form onSubmit={save} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
            <div className="bg-[#f8fafc] dark:bg-[#141d28] px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex justify-between items-start">
              <div>
                <span className="font-mono text-xs font-bold text-[#276fbf] bg-[#eef5fc] border px-2 py-1 rounded">{defect.defect_key}</span>
                <h1 className="text-lg font-bold mt-2">{defect.summary}</h1>
                <p className="text-xs text-slate-500 mt-1">Created {defect.created_at ? new Date(defect.created_at).toLocaleString() : ''}</p>
              </div>
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-600 font-semibold inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
            </div>
            <div className="p-6 space-y-5">
              <div><label className="block text-xs font-semibold mb-1.5">Summary *</label><input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} required className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div><label className="block text-xs font-semibold mb-1.5">Severity</label><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]">{['trivial','minor','major','critical','blocker'].map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
                <div><label className="block text-xs font-semibold mb-1.5">Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]">{['low','medium','high','critical'].map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
                <div><label className="block text-xs font-semibold mb-1.5">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]">{['new','open','in_progress','fixed','ready_for_retest','reopened','closed','rejected'].map((v) => <option key={v} value={v}>{v.replace('_',' ')}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-semibold mb-1.5">Environment</label><input value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} placeholder="Chrome / Windows, iOS 17..." className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
              <div><label className="block text-xs font-semibold mb-1.5">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
              <div><label className="block text-xs font-semibold mb-1.5">Steps to Reproduce</label><textarea value={form.stepsToReproduce} onChange={(e) => setForm({ ...form, stepsToReproduce: e.target.value })} rows={3} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold mb-1.5">Expected Result</label><textarea value={form.expectedResult} onChange={(e) => setForm({ ...form, expectedResult: e.target.value })} rows={2} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
                <div><label className="block text-xs font-semibold mb-1.5">Actual Result</label><textarea value={form.actualResult} onChange={(e) => setForm({ ...form, actualResult: e.target.value })} rows={2} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
              </div>
              <button disabled={saving} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        )}
        {defect && (
          <section className="mt-6 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Bug className="w-4 h-4" /> Linked From Test Execution</h3>
            {defect.test_cases ? (
              <p className="text-xs">Test case: <Link href={`/test-cases/${defect.test_case_id}`} className="text-[#276fbf] hover:underline font-semibold">{defect.test_cases.case_key} — {defect.test_cases.title}</Link></p>
            ) : <p className="text-xs text-slate-400">No test case linked. Created manually, or from the Defects page.</p>}
            {defect.test_execution_id && <p className="text-xs mt-2 text-slate-500">Execution: <span className="font-mono">{String(defect.test_execution_id).slice(0, 8)}</span> · Status: {defect.test_executions?.status ?? '—'}</p>}
            {!defect.test_execution_id && defect.test_cases && <p className="text-xs mt-2 text-slate-400">No execution linked.</p>}
          </section>
        )}
      </div>
        <ConfirmDialog open={showDeleteConfirm} title="Delete this defect?" message="This will permanently delete this defect. This cannot be undone." confirmLabel="Delete defect" deleting={deleting} onConfirm={remove} onCancel={() => setShowDeleteConfirm(false)} />
</main></div></div>
  );
}
