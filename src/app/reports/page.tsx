"use client";
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

function asArray(j: any, keys: string[]): any[] {
  if (Array.isArray(j)) return j;
  if (!j || typeof j !== 'object') return [];
  for (const k of keys) {
    if (Array.isArray(j[k])) return j[k];
  }
  return [];
}
function formatStatus(s: any): string {
  return String(s ?? '').replace(/[_-]+/g, ' ').trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Open';
}

export default function ReportsPage() {
  const [reqs, setReqs] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [defects, setDefects] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [traceRows, setTraceRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [rRes, cRes, dRes, tRes, pRes, trRes] = await Promise.all([
          fetch('/api/requirements', { cache: 'no-store' }),
          fetch('/api/test-cases', { cache: 'no-store' }),
          fetch('/api/defects', { cache: 'no-store' }),
          fetch('/api/test-runs', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
          fetch('/api/traceability', { cache: 'no-store' }).catch(() => null),
        ]);
        const rJ = await rRes.json().catch(() => ({}));
        const cJ = await cRes.json().catch(() => ({}));
        const dJ = await dRes.json().catch(() => ({}));
        const tJ = await tRes.json().catch(() => ({}));
        const pJ = await pRes.json().catch(() => ({}));
        const trJ = trRes ? await trRes.json().catch(() => ({})) : {};
        setReqs(asArray(rJ, ['requirements', 'reqs', 'data']));
        setCases(asArray(cJ, ['testCases', 'cases', 'test_cases', 'data']));
        setDefects(asArray(dJ, ['defects', 'data']));
        setRuns(asArray(tJ, ['testRuns', 'runs', 'test_runs', 'data']));
        setProjects(asArray(pJ, ['projects', 'data']));
        // Traceability is the source of truth for Coverage - it reads test_case_requirements join table.
        // /api/test-cases strips those link fields, so recomputing from cases alone gives 0%.
        setTraceRows(asArray(trJ, ['rows', 'data']));
      } catch {
        setReqs([]); setCases([]); setDefects([]); setRuns([]); setProjects([]); setTraceRows([]);
      } finally { setLoading(false); }
    })();
  }, []);

  const fReqs = projectFilter ? reqs.filter((r: any) => String(r.project_id) === projectFilter) : reqs;
  const fDefects = projectFilter ? defects.filter((d: any) => String(d.project_id) === projectFilter) : defects;
  const fRuns = projectFilter ? runs.filter((r: any) => String(r.project_id) === projectFilter) : runs;
  const fCases = projectFilter ? cases.filter((c: any) => String(c.project_id) === projectFilter) : cases;

  // COVERAGE - always from Traceability rows, filtered by project.
  // This is the fix: previously traceCoverage was only used when NO project was selected,
  // so picking "QA Management Platform" fell back to the broken local calc -> 0%.
  const fTrace = projectFilter
    ? traceRows.filter((r: any) => String(r.projectId ?? r.project_id ?? '') === projectFilter)
    : traceRows;
  const traceCovered = fTrace.filter((r: any) => Number(r.testCases ?? r.test_cases ?? 0) > 0 || String(r.coverage ?? '') === 'Covered').length;
  const traceTotal = fTrace.length;

  // Fallback only if /api/traceability returned nothing (e.g. API down)
  const isCaseLinked = (tc: any, req: any) => {
    const reqId = String(req.id ?? '');
    const reqCode = String(req.requirement_id ?? req.req_key ?? req.code ?? req.key ?? '');
    const vals: string[] = [];
    const push = (v: any) => { if (v !== null && v !== undefined && v !== '') vals.push(String(v)); };
    push(tc.requirement_id); push(tc.requirement_code); push(tc.requirement); push(tc.requirements);
    if (Array.isArray(tc.requirement_ids)) tc.requirement_ids.forEach(push);
    if (Array.isArray(tc.requirements)) tc.requirements.forEach(push);
    if (Array.isArray(tc.linked_requirements)) tc.linked_requirements.forEach(push);
    const flat = vals.join(',').split(',').map((s) => s.trim()).filter(Boolean);
    return flat.includes(reqId) || (reqCode !== '' && flat.includes(reqCode));
  };
  const fallbackCovered = fReqs.filter((req: any) => fCases.some((tc: any) => isCaseLinked(tc, req))).length;

  // Use Traceability when available, otherwise fallback. Total shown = same denominator as Coverage.
  const totalRequirements = traceTotal > 0 ? traceTotal : fReqs.length;
  const covered = traceTotal > 0 ? traceCovered : fallbackCovered;
  const coverage = totalRequirements > 0 ? Math.round((covered / totalRequirements) * 100) : 0;

  const defectStatus = (d: any) => String(d.status ?? '').toLowerCase().trim();
  const fixedDefects = fDefects.filter((d: any) => ['fixed', 'closed', 'resolved'].includes(defectStatus(d))).length;
  const openDefects = fDefects.filter((d: any) => !['fixed', 'closed', 'resolved', 'rejected'].includes(defectStatus(d))).length;
  const byStatus: Record<string, number> = {};
  fDefects.forEach((d: any) => { const key = formatStatus(d.status ?? 'Open'); byStatus[key] = (byStatus[key] || 0) + 1; });
  const defectsByStatus = Object.entries(byStatus).map(([status, count]) => ({ status, count }));
  const maxDefect = Math.max(1, ...defectsByStatus.map((x) => x.count));
  const runStatus = (r: any) => String(r.status ?? r.state ?? '').toLowerCase().trim();
  const completedRuns = fRuns.filter((r: any) => runStatus(r) === 'completed').length;
  const totalRuns = fRuns.length;
  const sortedRuns = [...fRuns].sort((a: any, b: any) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime());
  const recentRuns = sortedRuns.slice(0, 5);
  const cards = [
    { label: 'TOTAL REQUIREMENTS', value: loading ? '—' : String(totalRequirements) },
    { label: 'COVERAGE', value: loading ? '—' : `${coverage}%` },
    { label: 'FIXED DEFECTS', value: loading ? '—' : String(fixedDefects) },
    { label: 'OPEN DEFECTS', value: loading ? '—' : String(openDefects) },
  ];
  const statusColor = (s: string) => { const v = s.toLowerCase(); if (v === 'open') return 'bg-red-500'; if (v.includes('progress')) return 'bg-yellow-400'; if (v === 'fixed' || v === 'closed' || v === 'resolved') return 'bg-green-500'; return 'bg-slate-400'; };
  const statusTextColor = (s: string) => { const v = s.toLowerCase(); if (v === 'open') return 'text-red-400'; if (v.includes('progress')) return 'text-yellow-400'; if (v === 'fixed' || v === 'closed' || v === 'resolved') return 'text-green-400'; return 'text-slate-300'; };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex flex-wrap gap-2 items-start justify-between">
              <div>
                <h1 className="text-xs font-normal text-slate-900 dark:text-white">Reports</h1>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">Summary of testing coverage and quality.</p>
              </div>
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="text-xs font-normal bg-white dark:bg-[#182232] border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5">
                <option value="">All Projects</option>
                {projects.map((p: any) => (<option key={p.id} value={String(p.id)}>{p.name ?? p.title}</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {cards.map((c) => (
                <div key={c.label} className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-5 text-center">
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{c.label}</p>
                  <p className="text-2xl font-normal text-slate-900 dark:text-white mt-2">{c.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-3">{!loading ? `${totalRequirements} requirements · ${completedRuns} of ${totalRuns} runs completed.` : ''}</p>
            <div className="grid lg:grid-cols-2 gap-4 mt-4">
              <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-5">
                <h2 className="text-xs font-normal text-slate-900 dark:text-white">Defects by Status</h2>
                {defectsByStatus.length === 0 ? <p className="text-xs font-normal text-slate-500 mt-3">No defects yet.</p> : (
                  <div className="space-y-2 mt-3">{defectsByStatus.map((d) => (
                    <div key={d.status} className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${statusColor(d.status)}`} /><span className={`text-xs font-normal ${statusTextColor(d.status)} flex-1`}>{d.status}</span><span className="text-xs font-normal">{d.count}</span><div className="w-24 bg-slate-100 dark:bg-slate-700 rounded h-1.5 overflow-hidden"><div className={`h-full ${statusColor(d.status)}`} style={{ width: `${(d.count / maxDefect) * 100}%` }} /></div></div>
                  ))}</div>
                )}
              </div>
              <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-5">
                <h2 className="text-xs font-normal text-slate-900 dark:text-white">Recent Test Runs</h2>
                {recentRuns.length === 0 ? <p className="text-xs font-normal text-slate-500 mt-3">No test runs yet.</p> : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50 mt-2">{recentRuns.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 py-2.5"><span className="text-xs font-normal truncate">{r.name ?? r.title ?? 'Run'}</span><span className={`text-xs font-normal shrink-0 px-2 py-0.5 rounded ${runStatus(r) === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>{formatStatus(r.status ?? 'In Progress')}</span></div>
                  ))}</div>
                )}
              </div>
            </div>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-3">Coverage = Covered if at least 1 test case is linked via test_case_requirements — same definition as Traceability.</p>
          </div>
        </main>
      </div>
    </div>
  );
}