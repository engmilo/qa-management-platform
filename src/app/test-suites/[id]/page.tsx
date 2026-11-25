"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

// Text icons only - copy-paste safe, no vector tags that get stripped
const WarningIcon = () => (
  <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center" aria-hidden="true">
    <span className="text-lg leading-none">!</span>
  </div>
);
const TrashIcon = () => (
  <span aria-hidden="true" className="text-sm leading-none">x</span>
);
const plainRedBtn = "inline-flex items-center gap-1 text-xs font-normal text-red-500 hover:text-red-400 bg-transparent border-0 px-2 py-1 cursor-pointer whitespace-nowrap shrink-0";

export default function TestSuiteDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [suite, setSuite] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [allCases, setAllCases] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [caseToRemove, setCaseToRemove] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [inlineError, setInlineError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [sRes, cRes, suiteCasesRes] = await Promise.all([
          fetch(`/api/test-suites/${id}`, { cache: 'no-store' }),
          fetch('/api/test-cases', { cache: 'no-store' }),
          fetch(`/api/test-suites/${id}/cases`, { cache: 'no-store' }),
        ]);
        const sJ = await sRes.json().catch(() => ({}));
        const s = sJ.testSuite ?? sJ.suite ?? sJ ?? null;
        setSuite(s);
        const cJ = await cRes.json().catch(() => ({}));
        const all = cJ.testCases ?? cJ.cases ?? cJ ?? [];
        const allArr = Array.isArray(all) ? all : [];
        setAllCases(allArr);
        if (s) {
          setForm({ name: s.name ?? '', description: s.description ?? '' });
          const scJ = await suiteCasesRes.json().catch(() => ({}));
          const fromCasesEndpoint = scJ.cases ?? scJ.testCases ?? scJ.test_cases ?? null;
          let found: any[] = [];
          if (Array.isArray(fromCasesEndpoint) && fromCasesEndpoint.length > 0) {
            found = fromCasesEndpoint;
          } else {
            const raw = s.cases ?? s.testCases ?? s.test_cases ?? s.testCaseIds ?? s.case_ids ?? null;
            if (Array.isArray(raw) && raw.length > 0) {
              if (typeof raw[0] === 'object') found = raw;
              else found = raw.map((cid: any) => allArr.find((c: any) => String(c.id) === String(cid))).filter(Boolean);
            }
          }
          if (found.length === 0) {
            found = allArr.filter((c: any) => {
              const sid = c.suite_id ?? c.test_suite_id ?? c.suiteId;
              if (sid && String(sid) === String(id)) return true;
              const arr = c.suite_ids ?? c.suites ?? c.suiteIds ?? [];
              if (Array.isArray(arr) && arr.some((x: any) => String(typeof x === 'object' ? x.id : x) === String(id))) return true;
              if (c.suite && String(typeof c.suite === 'object' ? c.suite.id : c.suite) === String(id)) return true;
              return false;
            });
          }
          setCases(found);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, [id]);

  const save = async () => {
    setSaving(true);
    setInlineError('');
    try {
      const res = await fetch(`/api/test-suites/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Save failed');
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e: any) {
      setInlineError(e?.message || 'Save failed');
    } finally { setSaving(false); }
  };
  const doDelete = async () => {
    try {
      const res = await fetch(`/api/test-suites/${id}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Delete failed');
      window.location.href = '/test-suites';
    } catch (e: any) {
      setInlineError(e?.message || 'Delete failed');
    }
  };
  const addCase = async () => {
    if (!selected) return;
    const found = allCases.find((c: any) => String(c.id) === String(selected));
    if (!found) return;
    if (cases.find((c: any) => String(c.id) === String(found.id))) { setSelected(''); return; }
    setInlineError('');
    try {
      const res = await fetch(`/api/test-suites/${id}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCaseId: String(found.id) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not add case.');
      setCases([...cases, found]);
      setSelected('');
    } catch (e: any) {
      setInlineError(e?.message || 'Could not add case.');
    }
  };
  const doRemove = async () => {
    if (!caseToRemove) return;
    const keep = cases;
    const removeId = String(caseToRemove.id);
    setCases(cases.filter((x: any) => String(x.id) !== removeId));
    setShowRemove(false);
    setCaseToRemove(null);
    try {
      const res = await fetch(`/api/test-suites/${id}/cases?testCaseId=${encodeURIComponent(removeId)}`, { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Could not remove case.');
    } catch (e: any) {
      setCases(keep);
      setInlineError(e?.message || 'Could not remove case.');
    }
  };

  const inputCls = "text-xs font-normal bg-white dark:bg-[#101622] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-2 w-full";
  const labelCls = "text-xs font-semibold text-slate-500 dark:text-slate-400";

  if (loading) return (<div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622]"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 p-6 text-xs font-normal">Loading...</main></div></div>);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full mx-auto">
            <Link href="/test-suites" className="text-xs font-normal text-blue-600 dark:text-blue-400 hover:underline">Back to Test Suites</Link>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> / {form.name}</span>
            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md overflow-hidden mt-3">
              <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
                <div>
                  <h1 className="text-base font-bold text-slate-900 dark:text-white">{form.name}</h1>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">{cases.length} test case(s)</p>
                </div>
                <button onClick={() => setShowDelete(true)} className="inline-flex items-center gap-1 shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-normal text-xs px-3 py-1.5 rounded"><TrashIcon /><span>Delete</span></button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div><label className={labelCls}>Suite Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls + ' mt-1'} /></div>
                <div><label className={labelCls}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ overflow: 'hidden', resize: 'none' }} className={inputCls + ' mt-1 leading-relaxed'} /></div>
                <button onClick={save} disabled={saving} className="w-full text-xs font-normal bg-green-600 hover:bg-green-700 text-white rounded px-3 py-2.5">{saving ? 'Saving...' : savedFlash ? 'Saved' : 'Save Changes'}</button>
                {inlineError && <p className="text-xs font-normal text-red-600 dark:text-red-400">{inlineError}</p>}
              </div>
            </div>
            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-5 mt-4">
              <h2 className="text-xs font-normal text-slate-900 dark:text-white">Test Cases in this Suite</h2>
              <div className="flex gap-2 mt-3">
                <select value={selected} onChange={(e) => setSelected(e.target.value)} className={inputCls + ' flex-1'}><option value="">Select a test case to add...</option>{allCases.map((c: any) => (<option key={c.id} value={String(c.id)}>{c.case_key ?? c.code} - {c.title}</option>))}</select>
                <button onClick={addCase} className="text-xs font-normal bg-[#276fbf] hover:bg-[#1f5a9a] disabled:opacity-50 text-white rounded px-3.5 py-2 shrink-0">Add Case</button>
              </div>
              <div className="mt-3 space-y-2">
                {cases.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700/50 rounded px-3 py-2">
                    <Link href={`/test-cases/${c.id}`} className="text-sm font-normal text-blue-600 dark:text-blue-400 hover:underline flex-1 min-w-0 truncate">{c.case_key ?? c.code} - {c.title}</Link>
                    <button onClick={() => { setCaseToRemove(c); setShowRemove(true); }} className={plainRedBtn}><span aria-hidden="true" className="text-sm leading-none">x</span><span>Remove</span></button>
                  </div>
                ))}
                {cases.length === 0 && <p className="text-xs font-normal text-slate-500">No test cases in this suite yet.</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-[#182232] rounded-lg p-5 w-full max-w-md shadow-xl"><div className="flex gap-3"><WarningIcon /><div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete this test suite?</h3><p className="text-xs font-normal text-slate-400 dark:text-slate-400 mt-1.5 leading-relaxed">This will permanently delete this suite and unlink its test cases. The test cases themselves are kept. This cannot be undone.</p></div></div><div className="flex gap-2 mt-5 justify-end"><button onClick={() => setShowDelete(false)} className="text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-md px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button><button onClick={doDelete} className="text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md px-3.5 py-2">Delete suite</button></div></div></div>
      )}
      {showRemove && caseToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-[#182232] rounded-lg p-5 w-full max-w-md shadow-xl"><div className="flex gap-3"><WarningIcon /><div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Remove this test case from the suite?</h3><p className="text-xs font-normal text-slate-400 dark:text-slate-400 mt-1.5 leading-relaxed">This will remove {caseToRemove.case_key ?? caseToRemove.code} - {caseToRemove.title} from this suite. The test case itself is kept, you can add it back later.</p></div></div><div className="flex gap-2 mt-5 justify-end"><button onClick={() => { setShowRemove(false); setCaseToRemove(null); }} className="text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-md px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button><button onClick={doRemove} className="text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md px-3.5 py-2">Remove case</button></div></div></div>
      )}
    </div>
  );
}