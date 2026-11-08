'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, PlayCircle } from 'lucide-react';

type TestRun = { id: string; name: string; project_id: string; test_plan_id: string | null; status: string; started_at: string };
type Project = { id: string; name: string };

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/test-runs', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([runsResponse, projectsResponse]) => {
        const [runsData, projectsData] = await Promise.all([runsResponse.json(), projectsResponse.json()]);
        if (!runsResponse.ok) throw new Error(runsData.error || 'Could not load test runs.');
        if (!projectsResponse.ok) throw new Error(projectsData.error || 'Could not load projects.');
        setRuns(runsData.testRuns ?? []);
        setProjectNames(Object.fromEntries((projectsData.projects as Project[]).map((project) => [project.id, project.name])));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load test runs.'))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-[#dff0d8] dark:bg-[#132c1c] text-[#3c763d] dark:text-[#52c41a] border border-[#d6e9c6] dark:border-[#1d4c2b]';
      case 'in_progress':
        return 'bg-[#e0f2fe] dark:bg-[#112d44] text-[#0369a1] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#1e4d6d]';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Test Runs &amp; Results</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Execute test suites, record pass/fail results, and monitor execution milestones
              </p>
            </div>
            <Link
              href="/test-runs/new"
              className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors inline-flex items-center gap-1.5 focus:outline-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Test Run</span>
            </Link>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-8 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
              Loading test runs...
            </div>
          ) : runs.length === 0 ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center shadow-sm">
              <PlayCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No test runs found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Start a new test run to execute tests and log results against your project test cases.
              </p>
              <Link
                href="/test-runs/new"
                className="mt-4 inline-flex items-center gap-1.5 bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Start a test run
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Run Name</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f7] dark:divide-[#222e3e]">
                    {runs.map((run) => (
                      <tr key={run.id} className="hover:bg-[#f8fafc] dark:hover:bg-[#1f2c3f] transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white">
                          <span className="text-[#276fbf] dark:text-[#4da3ff] hover:underline cursor-pointer">
                            {run.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                          {projectNames[run.project_id] || 'General Project'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getStatusBadge(run.status)}`}>
                            {run.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {new Date(run.started_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
