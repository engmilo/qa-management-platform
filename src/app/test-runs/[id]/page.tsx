'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ArrowLeft, X, CheckCircle2 } from 'lucide-react';

type Exec = { id?: string; test_case_id?: string; status?: string; test_cases?: { title?: string } | null; test_case?: { title?: string } | null };
type Run = { id: string; name?: string; title?: string; projects?: { name?: string; key?: string } | null; project?: string; status?: string; assigned_to?: string; assignee_name?: string; started_at?: string; created_at?: string; description?: string };

const pill = (s?: string) => {
  const v = (s || '').toLowerCase();
  if (v.includes('pass')) return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
  if (v.includes('fail')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
  if (v.includes('block')) return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
  return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
};
const fmt = (s?: string) => (s || 'In Progress').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function TestRunDetailPage() {
  const params = useParams(); const id = String((params as any)?.id || '');
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [execs, setExecs] = useState<Exec[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showComplete, setShowComplete] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/test-runs/${id}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Run not found (${res.status})`);
        const parsed = data.testRun ?? data.run ?? data.test_run ?? data.data ?? data;
        setRun(parsed);
        setStats(data.stats ?? null);
        setExecs(data.executions ?? data.test_cases ?? []);
      } catch (e: any) { setError(e?.message || 'Could not load test run.'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const confirmComplete = async () => {
    setCompleting(true); setError('');
    try {
      const res = await fetch(`/api/test-runs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `Complete failed (${res.status})`);
      const updated = d.testRun ?? d.run ?? d.data ?? d;
      setRun((r) => ({ ...r, ...updated, status: 'completed' }));
      setShowComplete(false);
    } catch (e: any) { setError(e?.message || 'Could not complete run.'); setShowComplete(false); }
    finally { setCompleting(false); }
  };

  const runName = run?.name || run?.title || 'Test Run';
  const projectName = run?.projects ? `${run.projects.key ? `${run.projects.key} — ` : ''}${run.projects.name || ''}` : (run?.project || 'QA Studio');
  const total = stats?.total ?? execs.length;
  const done = stats?.completed ?? execs.filter((x) => x.status !== 'not_run').length;
  const progress = stats?.progress ?? (total ? Math.round((done / total) * 100) : 0);

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
                    <h1 className="text-xs font-semibold text-slate-900 dark:text-white">{runName}</h1>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{projectName} {run.started_at || run.created_at ? `· ${new Date(run.started_at || run.created_at || '').toLocaleString()}` : ''}</p>
                    {error && <p className="text-xs font-semibold text-red-600 mt-1">{error}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${pill(run.status)}`}>{fmt(run.status)}</span>
                    <button onClick={() => router.push('/test-runs/new')} className="bg-[#276fbf] hover:bg-[#1e5a9e] text-white text-xs font-semibold px-3 py-2 rounded">+ New Run</button>
                    <button onClick={() => setShowComplete(true)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded">Complete Run</button>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4 mb-4">
                  <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-900 dark:text-white">Progress</span><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{done} / {total} · {progress}%</span></div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${progress}%` }} /></div>
                  <p className="text-xs font-semibold text-slate-500 mt-2">Assignee: <span className="text-slate-900 dark:text-white">{run.assignee_name || run.assigned_to || 'Milo Haireche'}</span></p>
                  {run.description && <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">{run.description}</p>}
                </div>
                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
                  <div className="p-4 border-b border-[#e2e8f0] dark:border-[#28374d]"><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Execution History — Test Cases</h2></div>
                  {execs.length === 0 ? <p className="p-4 text-xs font-semibold text-slate-500">No test cases in this run. This run was created without cases — completing it is still allowed.</p> : (
                    <table className="w-full table-fixed text-left">
                      <colgroup><col className="w-[60%]" /><col className="w-[40%]" /></colgroup>
                      <thead><tr className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]"><th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Test Case</th><th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Result</th></tr></thead>
                      <tbody>{execs.map((c, i) => (<tr key={c.id || c.test_case_id || i} className="border-b border-[#edf2f7] dark:border-[#222e3e] last:border-0"><td className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white break-words">{c.test_cases?.title || c.test_case?.title || `Case ${i + 1}`}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${pill(c.status)}`}>{fmt(c.status)}</span></td></tr>))}</tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      {showComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowComplete(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-green-600" /></span><h3 className="text-xs font-semibold text-slate-900 dark:text-white">Complete this run?</h3></div>
              <button onClick={() => setShowComplete(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">Complete <span className="text-slate-900 dark:text-white">{runName}</span>? Status will change to Completed.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowComplete(false)} className="px-3 py-2 rounded border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 text-xs font-semibold">Cancel</button>
              <button onClick={confirmComplete} disabled={completing} className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold">{completing ? 'Completing...' : 'Complete Run'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}