'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ArrowLeft } from 'lucide-react';

type RunCase = { id?: string; test_case_id?: string; title?: string; name?: string; status?: string; result?: string; assignee?: string; test_case?: { title?: string } | null };
type Run = { id: string; name?: string; title?: string; project?: string; project_name?: string; status?: string; assignee?: string; assignee_name?: string; started_at?: string; created_at?: string; description?: string; environment?: string; test_cases?: RunCase[]; cases?: RunCase[]; executions?: any[] };

const pill = (s?: string) => {
  const v = (s || '').toLowerCase();
  if (v.includes('pass')) return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
  if (v.includes('fail')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
  if (v.includes('block')) return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
  if (v.includes('skip')) return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600';
  return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
};

export default function TestRunDetailPage() {
  const params = useParams(); const id = String((params as any)?.id || '');
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/test-runs/${id}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || data.message || `Run not found (${res.status})`);
        setRun(data.run ?? data.test_run ?? data);
      } catch (e: any) { setError(e?.message || 'Could not load test run.'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const cases: RunCase[] = run?.test_cases ?? run?.cases ?? (run?.executions || []).map((x: any) => ({ id: x.id, test_case_id: x.test_case_id, title: x.test_case?.title || x.title, status: x.status || x.result }));
  const done = cases.filter((c) => ['passed', 'failed', 'blocked', 'skipped'].includes((c.status || c.result || '').toLowerCase())).length;
  const progress = cases.length ? Math.round((done / cases.length) * 100) : 0;

  const setResult = async (c: RunCase, result: string) => {
    const cid = c.test_case_id || c.id; if (!cid) return;
    setUpdating(cid);
    try {
      const res = await fetch(`/api/test-runs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ test_case_id: cid, status: result, result }) });
      if (!res.ok) throw new Error();
      setRun((r) => r ? { ...r, test_cases: (r.test_cases || []).map((x) => (x.test_case_id === cid || x.id === cid ? { ...x, status: result, result } : x)), cases: (r.cases || []).map((x) => (x.test_case_id === cid || x.id === cid ? { ...x, status: result, result } : x)) } : r);
    } catch { setError('Could not save result. Try again.'); }
    finally { setUpdating(null); }
  };

  const completeRun = async () => {
    if (!confirm('Complete this run?')) return;
    try {
      const res = await fetch(`/api/test-runs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Completed' }) });
      if (!res.ok) throw new Error();
      setRun((r) => r ? { ...r, status: 'Completed' } : r);
    } catch { setError('Could not complete run.'); }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <Link href="/test-runs" className="inline-flex items-center gap-1 text-xs font-semibold text-[#276fbf]"><ArrowLeft className="w-3.5 h-3.5" /> Test Runs & Results</Link>
            {loading ? <div className="mt-4 bg-white dark:bg-[#182232] border rounded-md p-8 text-center text-xs font-semibold text-slate-500">Loading test run...</div> : error && !run ? (
              <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 text-xs font-semibold text-red-700 dark:text-red-300">{error}<br /><button onClick={() => router.push('/test-runs')} className="mt-2 underline">Back to Test Runs</button></div>
            ) : run && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 mt-3 mb-4">
                  <div>
                    <h1 className="text-xs font-semibold text-slate-900 dark:text-white">{run.name || run.title || 'Test Run'}</h1>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{run.project || run.project_name || 'QA Studio'} {run.environment ? `· ${run.environment}` : ''} {run.started_at || run.created_at ? `· ${new Date(run.started_at || run.created_at || '').toLocaleString()}` : ''}</p>
                    {error && <p className="text-xs font-semibold text-red-600 mt-1">{error}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${pill(run.status)}`}>{run.status || 'In Progress'}</span>
                    <button onClick={() => router.push('/test-runs/new')} className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-2 rounded">+ New Run</button>
                    <button onClick={completeRun} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded">Complete Run</button>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4 mb-4">
                  <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-900 dark:text-white">Progress</span><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{done} / {cases.length} · {progress}%</span></div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${progress}%` }} /></div>
                  <p className="text-xs font-semibold text-slate-500 mt-2">Assignee: <span className="text-slate-900 dark:text-white">{run.assignee_name || run.assignee || 'Milo Haireche'}</span></p>
                  {run.description && <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">{run.description}</p>}
                </div>

                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
                  <div className="p-4 border-b border-[#e2e8f0] dark:border-[#28374d]"><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Execution History — Test Cases</h2></div>
                  {cases.length === 0 ? <p className="p-4 text-xs font-semibold text-slate-500">No test cases in this run.</p> : (
                    <table className="w-full table-fixed text-left">
                      <colgroup><col className="w-[45%]" /><col className="w-[20%]" /><col className="w-[35%]" /></colgroup>
                      <thead><tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Test Case</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Result</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Actions</th>
                      </tr></thead>
                      <tbody>
                        {cases.map((c, i) => {
                          const st = c.status || c.result || 'Not Run';
                          return (
                            <tr key={c.id || c.test_case_id || i} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0">
                              <td className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white break-words">{c.title || c.name || c.test_case?.title || `Case ${i + 1}`}</td>
                              <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${pill(st)}`}>{st}</span></td>
                              <td className="px-4 py-3"><div className="flex flex-wrap gap-1">
                                {['Passed', 'Failed', 'Blocked', 'Skipped'].map((r) => (
                                  <button key={r} disabled={updating === (c.test_case_id || c.id)} onClick={() => setResult(c, r)} className="px-2 py-1 rounded border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">{r}</button>
                                ))}
                              </div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}