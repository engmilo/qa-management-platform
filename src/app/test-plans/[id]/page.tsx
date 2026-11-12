"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

// FIX 3: format DB status values: in_progress -> In Progress, under_review -> Under Review, etc.
const formatStatus = (s: any) => {
  if (!s) return '';
  return String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

// Exact Test Suites style: thin outline trash SVG, NOT emoji. Emoji renders bigger / different font.
// Test Suites uses text-xs font-medium, 14px icon, gap-1.
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
);
// Unified confirmation style — used for ALL Delete / Remove in the app:
// Unified confirmation — EXACT Test Suites sizes: Title text-sm font-semibold, Body text-xs font-normal, Buttons text-xs font-medium
// Red triangle: same in every modal
const WarningIcon = () => (
  <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center" aria-hidden="true">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
  </div>
);
const plainRedBtn = "inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-400 bg-transparent border-0 p-0 cursor-pointer";

export default function TestPlanDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [plan, setPlan] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [suiteToRemove, setSuiteToRemove] = useState<any>(null);
  const [form, setForm] = useState({ title: '', scope: '', status: 'planning', start_date: '', end_date: '', milestone_id: '', project_id: '' });

  // FIX 1: auto-grow for SCOPE textarea — no scrollbar
  const scopeRef = useRef<HTMLTextAreaElement>(null);
  const autoGrow = (el: HTMLTextAreaElement | null) => { if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };
  useEffect(() => { autoGrow(scopeRef.current); }, [form.scope, loading]);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, prRes, rRes, runRes, sRes] = await Promise.all([
          fetch(`/api/test-plans/${id}`, { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
          fetch('/api/releases', { cache: 'no-store' }),
          fetch('/api/test-runs', { cache: 'no-store' }),
          fetch('/api/test-suites', { cache: 'no-store' }),
        ]);
        const pJ = await pRes.json().catch(() => ({}));
        const p = pJ.testPlan ?? pJ.plan ?? pJ ?? null;
        setPlan(p);
        if (p) setForm({
          title: p.title ?? p.name ?? '',
          scope: p.scope ?? p.description ?? '',
          status: p.status ?? 'planning',
          start_date: p.start_date ? String(p.start_date).slice(0, 10) : '',
          end_date: p.end_date ? String(p.end_date).slice(0, 10) : '',
          milestone_id: p.milestone_id ?? p.release_id ?? '',
          project_id: p.project_id ?? '',
        });
        const prJ = await prRes.json().catch(() => ({})); setProjects(prJ.projects ?? prJ ?? []);
        const rJ = await rRes.json().catch(() => ({})); setReleases(rJ.releases ?? rJ.milestones ?? rJ ?? []);
        const runJ = await runRes.json().catch(() => ({}));
        const allRuns = runJ.testRuns ?? runJ.runs ?? runJ ?? [];
        setRuns(Array.isArray(allRuns) ? allRuns.filter((r: any) => String(r.test_plan_id ?? r.plan_id ?? '') === String(id)) : []);
        const sJ = await sRes.json().catch(() => ({}));
        const allSuites = sJ.testSuites ?? sJ.suites ?? sJ ?? [];
        // Suites linked to this plan: either via plan_id or via plan_suites join — show those that reference this plan, fallback to all if no link field
        setSuites(Array.isArray(allSuites) ? allSuites.filter((s: any) => !s.test_plan_id || String(s.test_plan_id) === String(id)) : []);
      } catch {} finally { setLoading(false); }
    })();
  }, [id]);

  const projectName = (pid: string) => { const p = projects.find((x: any) => String(x.id) === String(pid)); return p ? `${p.key} — ${p.name}` : ''; };
  const releaseName = (rid: string) => { const r = releases.find((x: any) => String(x.id) === String(rid)); return r ? (r.version_name ?? r.name ?? '') : ''; };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/test-plans/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Save failed');
      alert('Saved');
    } catch { alert('Save failed'); } finally { setSaving(false); }
  };
  const doDelete = async () => {
    try { const res = await fetch(`/api/test-plans/${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error(); window.location.href = '/test-plans'; } catch { alert('Delete failed'); }
  };

  const inputCls = "text-xs font-semibold bg-white dark:bg-[#101622] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-2 w-full";
  const labelCls = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide";

  if (loading) return (<div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622]"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 p-6 text-xs font-semibold">Loading...</main></div></div>);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-3xl mx-auto">
            <Link href="/test-plans" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">← Test Plans</Link>
            <span className="text-xs font-semibold text-slate-500"> / {form.title}</span>
            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md overflow-hidden mt-3">
              <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
                <div>
                  <h1 className="text-base font-bold text-slate-900 dark:text-white">{form.title}</h1>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{projectName(form.project_id)}{form.milestone_id ? ` · Milestone: ${releaseName(form.milestone_id)}` : ''}</p>
                </div>
                {/* FIX 2: Delete exactly like Test Suites — plain red text, no border, no background, no box */}
                <button onClick={() => setShowDelete(true)} className={plainRedBtn}><TrashIcon /><span>Delete</span></button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div><label className={labelCls}>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls + ' mt-1'} /></div>
                <div>
                  <label className={labelCls}>Scope</label>
                  {/* FIX 1: Textarea auto-grow, overflow hidden, resize none — no scrollbar */}
                  <textarea ref={scopeRef} value={form.scope} onChange={(e) => { setForm({ ...form, scope: e.target.value }); autoGrow(e.target); }} onFocus={(e) => autoGrow(e.target)} rows={3} style={{ overflow: 'hidden', resize: 'none' }} className={inputCls + ' mt-1 leading-relaxed'} placeholder="Scope: ..." />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={labelCls}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls + ' mt-1'}><option value="planning">Planning</option><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></div>
                  <div><label className={labelCls}>Start</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls + ' mt-1'} /></div>
                  <div><label className={labelCls}>End</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls + ' mt-1'} /></div>
                </div>
                <div><label className={labelCls}>Milestone (Release)</label><select value={form.milestone_id} onChange={(e) => setForm({ ...form, milestone_id: e.target.value })} className={inputCls + ' mt-1'}><option value="">—</option>{releases.map((r: any) => (<option key={r.id} value={String(r.id)}>{r.version_name ?? r.name} — {formatStatus(r.status)}</option>))}</select></div>
                <button onClick={save} disabled={saving} className="w-full text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded px-3 py-2.5">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-5 mt-4">
              <div className="flex items-center justify-between"><h2 className="text-xs font-semibold text-slate-900 dark:text-white">Test Runs in this Plan</h2><Link href={`/test-runs/new?plan=${id}`} className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1.5">Create Run from Plan</Link></div>
              <div className="mt-3 space-y-2">
                {runs.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between border border-slate-200 dark:border-slate-700/50 rounded px-3 py-2">
                    <Link href={`/test-runs/${r.id}`} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">{r.name}</Link>
                    {/* FIX 3: In Progress pill, not raw in_progress */}
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{formatStatus(r.status)}</span>
                  </div>
                ))}
                {runs.length === 0 && <p className="text-xs font-semibold text-slate-500">No runs in this plan yet.</p>}
              </div>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-5 mt-4">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white">Suites in this Plan</h2>
              <div className="mt-3 space-y-2">
                {suites.map((s: any) => (
                  <div key={s.id} className="border border-slate-200 dark:border-slate-700/50 rounded px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1 min-w-0 text-xs font-semibold">{s.name} — <span className="text-slate-500">{s.description}</span></span>
                      {/* FIX 2: Remove exactly like Test Suites — plain red text, X left of Remove, no box */}
                      <button onClick={() => { setSuiteToRemove(s); setShowRemove(true); }} className={plainRedBtn + " whitespace-nowrap shrink-0"}><span aria-hidden="true" className="text-sm leading-none">×</span><span>Remove</span></button>
                    </div>
                  </div>
                ))}
                {suites.length === 0 && <p className="text-xs font-semibold text-slate-500">No suites linked to this plan.</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-[#182232] rounded-lg p-5 w-full max-w-md shadow-xl"><div className="flex gap-3"><WarningIcon /><div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete this test plan?</h3><p className="text-xs font-normal text-slate-400 dark:text-slate-400 mt-1.5 leading-relaxed">This will permanently delete this plan and unlink its test runs and suites. This cannot be undone.</p></div></div><div className="flex gap-2 mt-5 justify-end"><button onClick={() => setShowDelete(false)} className="text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-md px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button><button onClick={doDelete} className="text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md px-3.5 py-2">Delete plan</button></div></div></div>
      )}
      {showRemove && suiteToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white dark:bg-[#182232] rounded-lg p-5 w-full max-w-md shadow-xl"><div className="flex gap-3"><WarningIcon /><div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Remove suite from plan?</h3><p className="text-xs font-normal text-slate-400 dark:text-slate-400 mt-1.5 leading-relaxed">Remove {suiteToRemove.name} from this plan? The suite itself will not be deleted. This cannot be undone.</p></div></div><div className="flex gap-2 mt-5 justify-end"><button onClick={() => { setShowRemove(false); setSuiteToRemove(null); }} className="text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-md px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button><button onClick={() => { setSuites(suites.filter((x: any) => x.id !== suiteToRemove.id)); setShowRemove(false); setSuiteToRemove(null); }} className="text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md px-3.5 py-2">Remove suite</button></div></div></div>
      )}
    </div>
  );
}
