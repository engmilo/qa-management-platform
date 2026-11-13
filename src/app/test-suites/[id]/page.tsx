'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArrowLeft, Trash2, X } from 'lucide-react';

type CaseItem = { id: string; case_key: string; title: string; priority: string; test_type: string };

export default function TestSuiteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [suite, setSuite] = useState<any>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [allCases, setAllCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [caseToRemove, setCaseToRemove] = useState<CaseItem | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removingCase, setRemovingCase] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = async () => {
    const res = await fetch(`/api/test-suites/${id}`, { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not load suite.');
    setSuite(data.testSuite);
    setCases(data.cases ?? []);
    setForm({ name: data.testSuite.name ?? '', description: data.testSuite.description ?? '' });
    const cr = await fetch('/api/test-cases', { cache: 'no-store' });
    const cd = await cr.json();
    if (cr.ok) setAllCases(((cd.testCases ?? []) as CaseItem[]).filter((c) => (c as any).project_id === data.testSuite.project_id));
  };

  useEffect(() => {
    (async () => {
      try { await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load suite.'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`/api/test-suites/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setSuite(data.testSuite); setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/test-suites/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not delete.'); setShowDeleteConfirm(false); return; }
      router.push('/test-suites');
    } finally { setDeleting(false); }
  };

  const addCase = async () => {
    if (!selectedCaseId) return;
    setAdding(true); setError('');
    try {
      const res = await fetch(`/api/test-suites/${id}/cases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testCaseId: selectedCaseId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add case.');
      setSelectedCaseId('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add case.'); }
    finally { setAdding(false); }
  };

  const confirmRemoveCase = async () => {
    if (!caseToRemove) return;
    setRemovingCase(true); setError('');
    try {
      const res = await fetch(`/api/test-suites/${id}/cases?testCaseId=${caseToRemove.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not remove case.'); setShowRemoveConfirm(false); return; }
      setShowRemoveConfirm(false);
      setCaseToRemove(null);
      await load();
    } finally { setRemovingCase(false); }
  };

  if (loading) return <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 p-6 text-xs">Loading...</main></div></div>;

  const available = allCases.filter((c) => !cases.some((x) => x.id === c.id));

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <Link href="/test-suites" className="text-[#276fbf] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Test Suites</Link>
            <span>/</span><span className="font-medium">{suite?.name}</span>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
          {saved && <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded text-xs">Saved.</div>}
          {suite && (
            <form onSubmit={save} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
              <div className="bg-[#f8fafc] dark:bg-[#141d28] px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex justify-between items-start">
                <div><h1 className="text-base font-bold text-slate-900 tracking-tight">{suite.name}</h1><p className="text-xs text-slate-500 mt-1">{cases.length} test case(s)</p></div>
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-600 font-semibold inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </div>
              <div className="p-6 space-y-5">
                <div><label className="block text-xs font-semibold mb-1.5">Suite Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
                <div><label className="block text-xs font-semibold mb-1.5">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#276fbf] resize-none overflow-hidden" onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} /></div>
                <button disabled={saving} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          )}
          <section className="mt-6 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5">
            <h3 className="text-sm font-bold mb-3">Test Cases in this Suite</h3>
            <div className="flex gap-2 mb-4">
              <select value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)} className="flex-1 border rounded px-3 py-2 text-sm">
                <option value="">Select a test case to add...</option>
                {available.map((c) => <option key={c.id} value={c.id}>{c.case_key} - {c.title}</option>)}
              </select>
              <button type="button" onClick={addCase} disabled={!selectedCaseId || adding} className="bg-[#276fbf] hover:bg-[#1f5a9a] disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded">{adding ? 'Adding...' : 'Add Case'}</button>
            </div>
            {cases.length === 0 ? (
              <p className="text-xs text-slate-400">No cases in this suite yet. Add one above.</p>
            ) : (
              <div className="space-y-2">
                {cases.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 border rounded px-3 py-2">
                    <Link href={`/test-cases/${c.id}`} className="text-xs font-semibold text-[#276fbf] hover:underline">{c.case_key} - {c.title}</Link>
                    <button type="button" onClick={() => { setCaseToRemove(c); setShowRemoveConfirm(true); }} className="text-xs text-red-600 font-semibold inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Remove</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <ConfirmDialog open={showRemoveConfirm} title="Remove this test case from the suite?" message={caseToRemove ? `This will remove ${caseToRemove.case_key} - ${caseToRemove.title} from this suite. The test case itself is kept, you can add it back later. This cannot be undone, but you can re-add it.` : 'This will remove this test case from this suite.'} confirmLabel="Remove case" deleting={removingCase} onConfirm={confirmRemoveCase} onCancel={() => { setShowRemoveConfirm(false); setCaseToRemove(null); }} />
        <ConfirmDialog open={showDeleteConfirm} title="Delete this test suite?" message="This will permanently delete this suite and unlink its test cases. The test cases themselves are kept. This cannot be undone." confirmLabel="Delete suite" deleting={deleting} onConfirm={remove} onCancel={() => setShowDeleteConfirm(false)} />
      </main>
    </div></div>
  );
}