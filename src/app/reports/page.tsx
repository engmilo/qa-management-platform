'use client';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';


type Project = { id: string; name: string; key: string };

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalCases: 0,
    totalRuns: 0,
    completedRuns: 0,
    openDefects: 0,
    totalRequirements: 0,
    passRate: null as number | null,
    coveragePct: 0,
  });
  const [defectsByStatus, setDefectsByStatus] = useState<Record<string, number>>({});
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [cRes, rRes, dRes, reqRes, pRes, dashRes, traceRes] = await Promise.all([
          fetch('/api/test-cases', { cache: 'no-store' }),
          fetch('/api/test-runs', { cache: 'no-store' }),
          fetch('/api/defects', { cache: 'no-store' }),
          fetch('/api/requirements', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
          fetch('/api/dashboard', { cache: 'no-store' }),
          fetch('/api/traceability', { cache: 'no-store' }),
        ]);
        const parse = async (res: Response) => {
          const t = await res.text();
          try { return t ? JSON.parse(t) : {}; } catch { return {}; }
        };
        const c = await parse(cRes);
        const r = await parse(rRes);
        const d = await parse(dRes);
        const req = await parse(reqRes);
        const p = await parse(pRes);
        const dash = await parse(dashRes);
        const trace = await parse(traceRes);
        const coveragePct = trace.coveragePct ?? trace.coverage ?? 0;
        const cases = c.testCases ?? c.cases ?? [];
        const allRuns = r.testRuns ?? r.runs ?? [];
        const defects = d.defects ?? [];
        const reqs = req.requirements ?? [];
        setProjects(p.projects ?? []);
        setRuns(allRuns.slice(0, 5));
        const completed = allRuns.filter((x: any) => x.status === 'completed').length;
        const open = defects.filter((x: any) => ['new', 'open', 'in_progress', 'reopened'].includes((x.status || '').toLowerCase())).length;
        let passRate: number | null = null;
        if (dash?.passRate != null) passRate = dash.passRate;
        const byStatus: Record<string, number> = {};
        defects.forEach((x: any) => { const k = (x.status || 'unknown').toLowerCase(); byStatus[k] = (byStatus[k] || 0) + 1; });
        setDefectsByStatus(byStatus);
        setStats({ totalCases: cases.length, totalRuns: allRuns.length, completedRuns: completed, openDefects: open, totalRequirements: reqs.length, passRate, coveragePct });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load reports.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filteredRuns = useMemo(() => {
    if (projectFilter === 'all') return runs;
    return runs.filter((r: any) => r.project_id === projectFilter);
  }, [runs, projectFilter]);

  const totalDefectsForCards = Object.values(defectsByStatus).reduce((a, b) => a + b, 0);
  const cards = [
    { label: 'Total Requirements', value: stats.totalRequirements },
    { label: 'Coverage', value: `${stats.coveragePct}%` },
    { label: 'Fixed Defects', value: totalDefectsForCards - stats.openDefects },
    { label: 'Open Defects', value: stats.openDefects },
  ];

  const totalDefects = Object.values(defectsByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight text-left m-0">Reports</h1>
                <p className="text-xs text-slate-500 mt-0.5 font-normal">Summary of testing coverage and quality.</p>
              </div>
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border rounded px-2 py-1.5 text-xs font-normal bg-white dark:bg-[#1f2c3f]">
                <option value="all">All Projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
              </select>
            </div>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}

            {loading ? (
              <div className="bg-white border rounded-md p-8 text-center text-xs text-slate-500">Loading reports...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  {cards.map((c) => {
                    return (
                      <div key={c.label} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4">
                        <p className="text-xs font-semibold uppercase text-slate-400">{c.label}</p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white mt-2">{c.value}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Defects by Status</h2>
                    {totalDefects === 0 ? (
                      <p className="text-xs text-slate-500">No defects found.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(defectsByStatus).map(([status, count]) => (
                          <div key={status} className="flex items-center gap-2">
                            <span className={status==='open' ? 'text-xs font-semibold capitalize w-28 break-words text-red-600 dark:text-red-400' : status==='fixed' || status==='closed' ? 'text-xs font-semibold capitalize w-28 break-words text-green-600 dark:text-green-400' : status==='in_progress' ? 'text-xs font-semibold capitalize w-28 break-words text-yellow-600 dark:text-yellow-400' : 'text-xs font-semibold capitalize w-28 break-words'}>{status.replace('_', ' ')}</span>
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-[#222e3e] rounded-full overflow-hidden"><div className={status==='open' ? 'h-full bg-red-500' : status==='fixed' || status==='closed' ? 'h-full bg-green-500' : status==='in_progress' ? 'h-full bg-yellow-500' : 'h-full bg-[#276fbf]'} style={{ width: `${Math.round((count / totalDefects) * 100)}%` }} /></div>
                            <span className="text-xs font-semibold w-10 text-right">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-4">{stats.totalRequirements} requirements · {stats.completedRuns} of {stats.totalRuns} runs completed.</p>
                  </div>

                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Recent Test Runs</h2>
                    {filteredRuns.length === 0 ? (
                      <p className="text-xs text-slate-500">No test runs found.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredRuns.map((r: any) => (
                          <div key={r.id} className="flex items-center gap-2 border border-[#edf2f7] dark:border-[#222e3e] rounded p-2.5">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white flex-1 min-w-0 break-words">{r.name}</span>
                            <span className={r.status==='completed' ? 'inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal text-xs' : r.status==='in_progress' ? 'inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 capitalize font-normal text-xs' : r.status==='failed' ? 'inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 capitalize font-normal text-xs' : r.status==='blocked' ? 'inline-block px-2 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 capitalize font-normal text-xs' : 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 capitalize font-normal text-xs'}>{(r.status || '').replace('_', ' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}