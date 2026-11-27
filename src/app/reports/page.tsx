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
  const [traceCoverage, setTraceCoverage] = useState<number | null>(null);
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
        // Traceability is the source of truth for coverage — it reads full rows from Supabase.
        // /api/test-cases strips the requirement-link fields, so recomputing here gave 0%.
        if (typeof trJ.coveragePct === 'number') setTraceCoverage(trJ.coveragePct);
        else if (typeof trJ.coverage === 'number') setTraceCoverage(trJ.coverage);
        // Real shapes used elsewhere in the app:
        // requirements -> { requirements: [] }, test-cases -> { testCases: [] } / { cases: [] },
        // defects -> { defects: [] }, test-runs -> { testRuns: [] } (camelCase!), projects -> { projects: [] }
        setReqs(asArray(rJ, ['requirements', 'reqs', 'data']));
        setCases(asArray(cJ, ['testCases', 'cases', 'test_cases', 'data']));
        setDefects(asArray(dJ, ['defects', 'data']));
        setRuns(asArray(tJ, ['testRuns', 'runs', 'test_runs', 'data']));
        setProjects(asArray(pJ, ['projects', 'data']));
      } catch {
        setReqs([]); setCases([]); setDefects([]); setRuns([]); setProjects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter by project when a project is chosen — otherwise show all
  const fReqs = projectFilter ? reqs.filter((r: any) => String(r.project_id) === projectFilter) : reqs;
  const fDefects = projectFilter ? defects.filter((d: any) => String(d.project_id) === projectFilter) : defects;
  const fRuns = projectFilter ? runs.filter((r: any) => String(r.project_id) === projectFilter) : runs;
  // Test cases filtered for coverage: only cases that belong to the filtered requirements' project
  // (if no project filter, all cases count)
  const fCases = projectFilter ? cases.filter((c: any) => String(c.project_id) === projectFilter) : cases;

  // Coverage: same logic as /api/traceability — a requirement is covered if any test case links to it
  const isCaseLinked = (tc: any, req: any) => {
    const reqId = String(req.id ?? '');
    const reqCode = String(req.requirement_id ?? req.req_key ?? req.code ?? req.key ?? '');
    const vals: string[] = [];
    const push = (v: any) => { if (v !== null && v !== undefined && v !== '') vals.push(String(v)); };
    push(tc.requirement_id);
    push(tc.requirement_code);
    push(tc.requirement);
    push(tc.requirements);
    if (Array.isArray(tc.requirement_ids)) tc.requirement_ids.forEach(push);
    if (Array.isArray(tc.requirements)) tc.requirements.forEach(push);
    if (Array.isArray(tc.linked_requirements)) tc.linked_requirements.forEach(push);
    const flat = vals.join(',').split(',').map((s) => s.trim()).filter(Boolean);
    return flat.includes(reqId) || (reqCode !== '' && flat.includes(reqCode));
  };
  const covered = fReqs.filter((req: any) => fCases.some((tc: any) => isCaseLinked(tc, req))).length;
  const totalRequirements = fReqs.length;
  // Use traceability coverage when showing All Projects — it was 100% before.
  // Only use the local calc as fallback / when a single project is filtered.
  const coverage = !projectFilter && traceCoverage !== null ? traceCoverage : (totalRequirements > 0 ? Math.round((covered / totalRequirements) * 100) : 0);

  const defectStatus = (d: any) => String(d.status ?? '').toLowerCase().trim();
  const fixedDefects = fDefects.filter((d: any) => ['fixed', 'closed', 'resolved'].includes(defectStatus(d))).length;
  const openDefects = fDefects.filter((d: any) => !['fixed', 'closed', 'resolved', 'rejected'].includes(defectStatus(d))).length;

  // Defects by Status — group by status, e.g. Open 1, In Progress 1
  const byStatus: Record<string, number> = {};
  fDefects.forEach((d: any) => {
    const key = formatStatus(d.status ?? 'Open');
    byStatus[key] = (byStatus[key] || 0) + 1;
  });
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

  const statusColor = (s: string) => {
    const v = s.toLowerCase();
    if (v === 'open') return 'bg-red-500';
    if (v.includes('progress')) return 'bg-yellow-400';
    if (v === 'fixed' || v === 'closed' || v === 'resolved') return 'bg-green-500';
    return 'bg-slate-400';
  };
  const statusTextColor = (s: string) => {
    const v = s.toLowerCase();
    if (v === 'open') return 'text-red-400';
    if (v.includes('progress')) return 'text-yellow-400';
    if (v === 'fixed' || v === 'closed' || v === 'resolved') return 'text-green-400';
    return 'text-slate-300';
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex flex-wrap gap-2 items-start justify-between">
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight text-left m-0">Reports</h1>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">Summary of testing coverage and quality.</p>
              </div>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="text-xs font-normal bg-white dark:bg-[#182232] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-2 py-1.5"
              >
                <option value="">All Projects</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Centered cards — same as Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 mb-4">
              {cards.map((c) => (
                <div
                  key={c.label}
                  className="report-card bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-4 text-center"
                >
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{c.label}</p>
                  <p className="text-2xl font-normal text-slate-900 dark:text-white mt-2 leading-none">{c.value}</p>
                </div>
              ))}
            </div>

            <p className="text-xs font-normal text-slate-500 mb-1">
              {!loading ? `${totalRequirements} requirements · ${completedRuns} of ${totalRuns} runs completed.` : ''}
            </p>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="report-card bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-4">
                <h2 className="text-xs font-normal text-slate-900 dark:text-white mb-3">Defects by Status</h2>
                {defectsByStatus.length ? (
                  defectsByStatus.map((x) => (
                    <div key={x.status} className="flex items-center gap-3 py-1.5">
                      <span className={`text-xs font-normal w-20 shrink-0 ${statusTextColor(x.status)}`}>{x.status}</span>
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full ${statusColor(x.status)}`} style={{ width: `${Math.round((x.count / maxDefect) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-normal text-slate-900 dark:text-white w-4 text-right">{x.count}</span>
                    </div>
                  ))
                ) : (
                  !loading && <p className="text-xs font-normal text-slate-500">No defects yet.</p>
                )}
              </div>

              <div className="report-card bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-4">
                <h2 className="text-xs font-normal text-slate-900 dark:text-white mb-3">Recent Test Runs</h2>
                {recentRuns.length ? (
                  recentRuns.map((r: any) => (
                    <div key={r.id} className="flex justify-between gap-2 py-2 border-b border-slate-200 dark:border-slate-700/50 last:border-0">
                      <span className="text-xs font-normal text-slate-900 dark:text-white truncate">{r.name ?? r.title ?? r.run_name ?? 'Test Run'}</span>
                      <span className={`text-xs font-normal shrink-0 px-2 py-0.5 rounded ${runStatus(r) === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                        {r.status ? formatStatus(r.status) : '—'}
                      </span>
                    </div>
                  ))
                ) : (
                  !loading && <p className="text-xs font-normal text-slate-500">No test runs yet.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
