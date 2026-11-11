'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { createBrowserClient } from '@supabase/ssr';
import { ArrowLeft, Bug, CheckCircle2, XCircle, MinusCircle, RotateCcw, Ban, Search, PlayCircle, CheckSquare, History } from 'lucide-react';

type Execution = { id: string; test_run_id: string; test_case_id: string; status: string; actual_result: string | null; comments: string | null; executed_at: string | null; tester_id?: string | null; updated_at?: string | null; test_cases: { id: string; case_key: string; title: string; priority: string; test_type: string; category: string; description: string | null; preconditions: string | null } | null };
type Run = { id: string; name: string; status: string; project_id: string; test_plan_id: string | null; assigned_to: string | null; description: string | null; configuration: string | null; started_at: string; completed_at: string | null; projects?: { name: string; key: string } | null; test_plans?: { title: string } | null };
type Stats = { total: number; passed: number; failed: number; blocked: number; retest: number; notRun: number; notApplicable: number; completed: number; progress: number; passRate: number | null };

const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  passed: { label: 'Passed', badge: 'bg-[#dff0d8] text-[#3c763d] border-[#d6e9c6]', dot: 'bg-[#48a43f]' },
  failed: { label: 'Failed', badge: 'bg-[#f2dede] text-[#a94442] border-[#ebccd1]', dot: 'bg-red-500' },
  blocked: { label: 'Blocked', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
  retest: { label: 'Retest', badge: 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]', dot: 'bg-amber-500' },
  not_run: { label: 'Not Run', badge: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-300' },
  not_applicable: { label: 'N/A', badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};
const FILTERS = ['all','not_run','passed','failed','blocked','retest'] as const;

export default function TestRunDetailPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, { status: string; actualResult: string; comments: string }>>({});
  const [savingId, setSavingId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [defectFor, setDefectFor] = useState<string>('');
  const [defectSummary, setDefectSummary] = useState('');
  const [defectSaving, setDefectSaving] = useState(false);
  const [defectMsg, setDefectMsg] = useState('');
  const [completing, setCompleting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [myName, setMyName] = useState('');
  const [myId, setMyId] = useState('');

  useEffect(() => {
    try {
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      supabase.auth.getUser().then(({ data }) => {
        const u = data.user;
        if (!u) return;
        setMyId(u.id);
        setMyName(String(u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || '').trim());
      });
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [rRes, eRes] = await Promise.all([fetch(`/api/test-runs/${runId}`, { cache: 'no-store' }), fetch(`/api/test-runs/${runId}/executions`, { cache: 'no-store' })]);
      const rData = await rRes.json(); const eData = await eRes.json();
      if (!rRes.ok) throw new Error(rData.error || 'Could not load test run.');
      if (!eRes.ok) throw new Error(eData.error || 'Could not load executions.');
      setRun(rData.testRun); setStats(rData.stats);
      const list = (eData.executions ?? []) as Execution[];
      setExecutions(list);
      setDrafts(Object.fromEntries(list.map((e) => [e.id, { status: e.status, actualResult: e.actual_result ?? '', comments: e.comments ?? '' }])));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load test run.'); }
    finally { setLoading(false); }
  }, [runId]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => executions.filter((e) => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (e.test_cases?.case_key ?? '').toLowerCase().includes(q) || (e.test_cases?.title ?? '').toLowerCase().includes(q) || (e.test_cases?.category ?? '').toLowerCase().includes(q);
  }), [executions, filter, query]);

  const history = useMemo(() => {
    return executions
      .filter((e) => e.executed_at)
      .slice()
      .sort((a, b) => new Date(b.executed_at!).getTime() - new Date(a.executed_at!).getTime());
  }, [executions]);

  const testerName = (testerId?: string | null) => {
    if (!testerId) return '—';
    if (testerId === myId && myName) return myName;
    return 'Assigned';
  };

  const saveExecution = async (id: string) => {
    const d = drafts[id]; if (!d) return;
    setSavingId(id); setError('');
    try {
      const res = await fetch(`/api/test-executions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: d.status, actualResult: d.actualResult, comments: d.comments }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save result.');
      setExecutions((cur) => cur.map((e) => e.id === id ? { ...e, status: d.status, actual_result: d.actualResult || null, comments: d.comments || null, executed_at: d.status === 'not_run' ? null : new Date().toISOString() } : e));
      const rRes = await fetch(`/api/test-runs/${runId}`, { cache: 'no-store' }); const rData = await rRes.json(); if (rRes.ok) setStats(rData.stats);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save result.'); }
    finally { setSavingId(''); }
  };

  const quickSet = (id: string, status: string) => {
    setDrafts((cur) => ({ ...cur, [id]: { ...(cur[id] ?? { status: 'not_run', actualResult: '', comments: '' }), status } }));
  };

  const bulkMark = async (status: string) => {
    if (!selected.size) return;
    setBulkSaving(true);
    try {
      for (const id of selected) {
        const d = drafts[id]; if (!d) continue;
        const res = await fetch(`/api/test-executions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, actualResult: d.actualResult, comments: d.comments }) });
        if (!res.ok) throw new Error('One or more results could not be saved.');
      }
      setSelected(new Set()); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Bulk update failed.'); }
    finally { setBulkSaving(false); }
  };

  const completeRun = async (to: 'completed' | 'in_progress') => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/test-runs/${runId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: to }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not update run.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update run.'); }
    finally { setCompleting(false); }
  };

  const createDefect = async (ex: Execution) => {
    if (!defectSummary.trim() || !run) return;
    setDefectSaving(true); setDefectMsg('');
    try {
      const res = await fetch('/api/defects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: run.project_id, summary: defectSummary.trim(), description: `From test run "${run.name}" — case ${ex.test_cases?.case_key} ${ex.test_cases?.title}`, testCaseId: ex.test_case_id, testExecutionId: ex.id, actualResult: drafts[ex.id]?.actualResult ?? ex.actual_result ?? '', status: undefined, severity: 'major', priority: 'medium' }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not create defect.');
      setDefectMsg(`Defect ${data.defect?.defect_key ?? ''} created and linked to this execution.`);
      setDefectFor(''); setDefectSummary('');
    } catch (e) { setDefectMsg(e instanceof Error ? e.message : 'Could not create defect.'); }
    finally { setDefectSaving(false); }
  };

  const isCompleted = run?.status === 'completed';
  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4"><Link href="/test-runs" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Test Runs</Link><span>/</span><span className="text-slate-800 dark:text-slate-200 font-medium">{run?.name ?? 'Test Run'}</span></div>
            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}
            {loading ? <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading test run...</div> : run ? (
              <>
                <section className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden mb-5">
                  <div className="bg-[#f8fafc] dark:bg-[#141d28] px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex flex-wrap items-center justify-between gap-3">
                    <div><h1 className="text-lg font-bold text-slate-900 dark:text-white">{run.name}</h1><p className="text-xs text-slate-500 mt-0.5">{run.projects?.key} — {run.projects?.name}{run.test_plans ? ` · Plan: ${run.test_plans.title}` : ''}{run.configuration ? ` · Config: ${run.configuration}` : ''}</p></div>
                    <div className="flex gap-2">
                      {isCompleted ? <button onClick={() => completeRun('in_progress')} disabled={completing} className="bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 border border-[#d8dee4] dark:border-[#28374d] text-xs font-semibold px-3 py-1.5 rounded">Reopen Run</button> : <button onClick={() => completeRun('completed')} disabled={completing} className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3 py-1.5 rounded">Complete Run</button>}
                      <Link href={`/test-runs/new?projectId=${run.project_id}`} className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-1.5 rounded">New Run</Link>
                    </div>
                  </div>
                  <div className="p-6">
                    {run.description && <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-wrap">{run.description}</p>}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {(['passed','failed','blocked','notRun'] as const).map((k) => {
                        const v = k === 'notRun' ? stats?.notRun ?? 0 : (stats as any)?.[k] ?? 0;
                        return <div key={k} className="border rounded p-2"><p className="text- font-normal uppercase text-slate-400">{k === 'notRun' ? 'Not Run' : k}</p><p className="text-sm font-normal">{v}</p></div>;
                      })}
                    </div>
                    <div className="flex justify-between text-xs mb-1.5"><span className="font-medium">{stats?.completed ?? 0} of {stats?.total ?? 0} executed</span><span className="font-semibold">{stats?.progress ?? 0}% · Pass rate {stats?.passRate == null ? '—' : `${stats?.passRate}%`}</span></div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border"><div className="h-full bg-[#48a43f]" style={{ width: `${stats?.progress ?? 0}%` }} /></div>
                    {isCompleted && <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">This run is completed. Reopen it to change results.</p>}
                  </div>
                </section>

                <div className="flex flex-wrap gap-2 items-center mb-4">
                  <div className="flex gap-1.5 flex-wrap">{FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`px-1.5 py-0.5 rounded text- font-normal border ${filter === f ? 'bg-[#1d2d3e] text-white' : 'bg-white text-slate-600 border-[#d8dee4]'}`}>{f === 'all' ? `All (${executions.length})` : `${STATUS_META[f]?.label ?? f} (${executions.filter((e) => e.status === f).length})`}</button>)}</div>
                  <div className="relative ml-auto"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search case key or title..." className="pl-8 pr-3 py-1.5 border rounded text-xs w-64" /></div>
                </div>

                {selected.size > 0 && <div className="mb-4 flex items-center gap-2 bg-[#eef5fc] border border-[#d2e3f5] rounded p-2.5 text-xs"><CheckSquare className="w-4 h-4 text-[#276fbf]" /><span>{selected.size} selected.</span><button disabled={bulkSaving} onClick={() => bulkMark('passed')} className="bg-[#48a43f] text-white px-2 py-1 rounded font-semibold">Mark Passed</button><button disabled={bulkSaving} onClick={() => bulkMark('failed')} className="bg-red-600 text-white px-2 py-1 rounded font-semibold">Mark Failed</button><button onClick={() => setSelected(new Set())} className="text-slate-500 underline">Clear</button></div>}

                <div className="space-y-3">
                  {filtered.length === 0 && <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">No executions match this filter.</div>}
                  {filtered.map((ex) => {
                    const d = drafts[ex.id] ?? { status: ex.status, actualResult: '', comments: '' };
                    const isOpen = expanded === ex.id;
                    const dirty = d.status !== ex.status || d.actualResult !== (ex.actual_result ?? '') || d.comments !== (ex.comments ?? '');
                    return (
                      <article key={ex.id} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                        <div className="flex items-start gap-3 p-4">
                          <input type="checkbox" checked={selected.has(ex.id)} onChange={(e) => { const s = new Set(selected); if (e.target.checked) s.add(ex.id); else s.delete(ex.id); setSelected(s); }} className="mt-1" />
                          <button onClick={() => setExpanded(isOpen ? '' : ex.id)} className="flex-1 text-left min-w-0">
                            <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-[#276fbf]">{ex.test_cases?.case_key}</span><span className={`px-1.5 py-0.5 rounded text- font-normal border ${STATUS_META[ex.status]?.badge ?? ''}`}>{STATUS_META[ex.status]?.label ?? ex.status}</span><span className="text- text-slate-400">{ex.test_cases?.priority} · {ex.test_cases?.test_type} · {ex.test_cases?.category}</span></div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 truncate">{ex.test_cases?.title}</p>
                            {ex.executed_at && <p className="text- text-slate-400 mt-0.5">Last executed {new Date(ex.executed_at).toLocaleString()}</p>}
                          </button>
                          <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                            {(['passed','failed','blocked','retest','not_run'] as const).map((s) => <button key={s} disabled={isCompleted} onClick={() => quickSet(ex.id, s)} className={`px-1.5 py-0.5 rounded text- font-normal border ${d.status === s ? 'bg-[#1d2d3e] text-white' : 'bg-white text-slate-600 border-[#d8dee4]'}`}>{STATUS_META[s].label}</button>)}
                          </div>
                        </div>
                        {isOpen && (
                          <div className="border-t border-[#edf2f7] dark:border-[#222e3e] p-4 space-y-4">
                            {ex.test_cases?.preconditions && <div><h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Preconditions</h4><p className="text-xs text-slate-700 whitespace-pre-wrap">{ex.test_cases.preconditions}</p></div>}
                            {ex.test_cases?.description && <div><h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Description / Steps</h4><p className="text-xs text-slate-700 whitespace-pre-wrap">{ex.test_cases.description}</p></div>}
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div><label className="block text-xs font-semibold mb-1.5">Actual Result</label><textarea value={d.actualResult} onChange={(e) => setDrafts((c) => ({ ...c, [ex.id]: { ...d, actualResult: e.target.value } }))} rows={3} className="w-full border rounded p-2 text-xs" placeholder="What actually happened?" /></div>
                              <div><label className="block text-xs font-semibold mb-1.5">Comments</label><textarea value={d.comments} onChange={(e) => setDrafts((c) => ({ ...c, [ex.id]: { ...d, comments: e.target.value } }))} rows={3} className="w-full border rounded p-2 text-xs" placeholder="Notes for the team..." /></div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button disabled={isCompleted || savingId === ex.id || !dirty} onClick={() => saveExecution(ex.id)} className="bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded">{savingId === ex.id ? 'Saving...' : dirty ? 'Save Result' : 'Saved'}</button>
                              <button onClick={() => { setDefectFor(defectFor === ex.id ? '' : ex.id); setDefectSummary(`${ex.test_cases?.case_key} — ${ex.test_cases?.title}`); }} className="bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 border border-[#d8dee4] dark:border-[#28374d] text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Bug className="w-3.5 h-3.5" /> Create Defect from this Failure</button>
                              <Link href={`/test-cases/${ex.test_case_id}`} className="text-xs font-semibold text-[#276fbf] hover:underline py-1.5">Open test case →</Link>
                            </div>
                            {defectFor === ex.id && <div className="bg-red-50 border border-red-200 rounded p-3"><label className="block text-xs font-semibold mb-1.5">Defect summary</label><input value={defectSummary} onChange={(e) => setDefectSummary(e.target.value)} className="w-full border rounded p-2 text-xs mb-2" /><button disabled={defectSaving || !defectSummary.trim()} onClick={() => createDefect(ex)} className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded">{defectSaving ? 'Creating...' : 'Create Defect'}</button>{defectMsg && <p className="text-xs mt-2">{defectMsg}</p>}</div>}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                <section className="mt-6 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                  <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><History className="w-4 h-4 text-slate-400" /> Execution History</span>
                    <span className="text-xs font-semibold text-[#276fbf]">{showHistory ? 'Hide ▲' : `Show (${history.length}) ▼`}</span>
                  </button>
                  {showHistory && (
                    <div className="border-t border-[#edf2f7] dark:border-[#222e3e] p-4">
                      <p className="text- text-slate-400 mb-3">Run created {new Date(run.started_at).toLocaleString()}{run.completed_at ? ` · Completed ${new Date(run.completed_at).toLocaleString()}` : ' · Still in progress'} — shows last result per case, newest first.</p>
                      {history.length === 0 ? (
                        <p className="text-xs text-slate-500">No executions yet. Mark a case Passed / Failed to see it here.</p>
                      ) : (
                        <div className="space-y-2">
                          {history.map((h) => (
                            <div key={h.id} className="flex flex-wrap items-start gap-2 border border-[#edf2f7] dark:border-[#222e3e] rounded p-3">
                              <span className="font-mono text-xs font-bold text-[#276fbf] shrink-0">{h.test_cases?.case_key}</span>
                              <span className={`px-1.5 py-0.5 rounded text- font-normal border shrink-0 ${STATUS_META[h.status]?.badge ?? ''}`}>{STATUS_META[h.status]?.label ?? h.status}</span>
                              <span className="text-xs font-medium text-slate-900 dark:text-white flex-1 min-w-">{h.test_cases?.title}</span>
                              <span className="text- text-slate-400">{new Date(h.executed_at!).toLocaleString()} · {testerName(h.tester_id)}</span>
                              {(h.comments || h.actual_result) && <p className="w-full text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{[h.actual_result, h.comments].filter(Boolean).join(' — ')}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>

              </>
            ) : <div className="bg-white border rounded-md p-8 text-center text-xs">Test run not found.</div>}
          </div>
        </main>
      </div>
    </div>
  );
}