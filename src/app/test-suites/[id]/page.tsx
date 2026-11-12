"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

// Unified confirmation — EXACT same as Step 1 Test Plans v2:
// Title text-sm font-semibold, Body text-xs font-normal, Buttons text-xs font-medium
const WarningIcon = () => (
  <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center" aria-hidden="true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
  </div>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
);
// Page Delete / Remove buttons: normal font-medium, NOT bold — matches Test Plans preference
const plainRedBtn = "inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-400 bg-transparent border-0 p-0 cursor-pointer";

export default function TestSuiteDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [suite, setSuite] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [allCases, setAllCases] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [caseToRemove, setCaseToRemove] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    (async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          fetch(`/api/test-suites/${id}`, { cache: 'no-store' }),
          fetch('/api/test-cases', { cache: 'no-store' }),
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
          // FIX: restore TC-001 — try EVERY shape, don't assume one:
          // 1) suite carries full case objects
          // 2) suite carries only case IDs -> map to full objects from /api/test-cases
          // 3) suite carries nothing -> filter all cases by suite_id / test_suite_id / suite_ids
          const raw = s.cases ?? s.testCases ?? s.test_cases ?? s.testCaseIds ?? s.case_ids ?? null;
          let found: any[] = [];
          if (Array.isArray(raw) && raw.length > 0) {
            if (typeof raw[0] === 'object') found = raw;
            else found = raw.map((cid: any) => allArr.find((c: any) => String(c.id) === String(cid))).filter(Boolean);
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
    try {
      const res = await fetch(`/api/test-suites/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Save failed');
    } catch { alert('Save failed'); } finally { setSaving(false); }
  };
  const doDelete = async () => {
    try { const res = await fetch(`/api/test-suites/${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error(); window.location.href = '/test-suites'; } catch { alert('Delete failed'); }
  };
  const addCase = () => {
    if (!selected) return;
    const found = allCases.find((c: any) => String(c.id) === String(selected));
    if (found && !cases.find((c: any) => String(c.id) === String(found.id))) setCases([...cases, found]);
    setSelected('');
  };

  const inputCls = "text-xs font-semibold bg-white dark:bg-[#101622] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-2 w-full";
  const labelCls = "text-xs font-semibold text-slate-500 dark:text-slate-400";

  if (loading) return (<div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622]"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 p-6 text-xs font-semibold">Loading...</main></div></div>);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-3xl mx-auto">
            <Link href="/test-suites" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">← Test Suites</Link>
            <span className="text-xs font-semibold text-slate-500"> / {form.name}</span>
            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md overflow-hidden mt-3">
              <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
                <div>
                  <h1 className="text-base font-bold text-slate-900 dark:text-white">{form.name}</h1>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{cases.length} test case(s)</p>
                </div>
                <button onClick={() => setShowDelete(true)} className={plainRedBtn}><TrashIcon /><span>Delete</span></button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div><label className={labelCls}>Suite Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls + ' mt-1'} /></div>
                <div><label className={labelCls}>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ overflow: 'hidden', resize: 'none' }} className={inputCls + ' mt-1 leading-relaxed'} /></div>
                <button onClick={save} disabled={saving} className="w-full text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded px-3 py-2.5">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-5 mt-4">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Test Cases in this Suite</h2>
              <div className="flex gap-2 mt-3">
                <select value={selected} onChange={(e) => setSelected(e.target.value)} className={inputCls + ' flex-1'}><option value="">Select a test case to add...</option>{allCases.map((c: any) => (<option key={c.id} value={String(c.id)}>{c.case_key ?? c.code} - {c.title}</option>))}</select>
                <button onClick={addCase} className="text-xs font-semibold bg-slate-600 hover:bg-slate-700 text-white rounded px-3 py-2 shrink-0">Add<br />Case</button>
              </div>
              <div className="mt-3 space-y-2">
                {cases.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700/50 rounded px-3 py-2">
                    <Link href={`/test-cases/${c.id}`} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex-1 min-w-0">{c.case_key ?? c.code} - {c.title}</Link>
                    <button onClick={() => { setCaseToRemove(c); setShowRemove(true); }} className={plainRedBtn + " whitespace-nowrap shrink-0"}><span aria-hidden="true" className="text-sm leading-none">×</span><span>Remove</span></button>
                  </div>
                ))}
                {cases.length === 0 && <p className="text-xs font-semibold text-slate-500">No test cases in this suite yet.</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-[#182232] rounded-lg p-5 w-full max-w-md shadow-xl"><div className="flex gap-3"><WarningIcon /><div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete this test suite?</h3><p className="text-xs font-normal text-slate-400 dark:text-slate-400 mt-1.5 leading-relaxed">This will permanently delete this suite and unlink its test cases. The test cases themselves are kept. This cannot be undone.</p></div></div><div className="flex gap-2 mt-5 justify-end"><button onClick={() => setShowDelete(false)} className="text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-md px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button><button onClick={doDelete} className="text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md px-3.5 py-2">Delete suite</button></div></div></div>
      )}
      {showRemove && caseToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-[#182232] rounded-lg p-5 w-full max-w-md shadow-xl"><div className="flex gap-3"><WarningIcon /><div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Remove this test case from the suite?</h3><p className="text-xs font-normal text-slate-400 dark:text-slate-400 mt-1.5 leading-relaxed">This will remove {caseToRemove.case_key ?? caseToRemove.code} - {caseToRemove.title} from this suite. The test case itself is kept, you can add it back later. This cannot be undone, but you can re-add it.</p></div></div><div className="flex gap-2 mt-5 justify-end"><button onClick={() => { setShowRemove(false); setCaseToRemove(null); }} className="text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-md px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button><button onClick={async () => { const keep = cases; setCases(cases.filter((x: any) => x.id !== caseToRemove.id)); setShowRemove(false); setCaseToRemove(null); try { await fetch(`/api/test-suites/${id}/cases/${caseToRemove.id}`, { method: 'DELETE' }); } catch { setCases(keep); } }} className="text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md px-3.5 py-2">Remove case</button></div></div></div>
      )}
    </div>
  );
}
