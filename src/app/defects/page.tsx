'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, Bug } from 'lucide-react';

type Defect = { id: string; defect_key: string; summary: string; project_id: string; severity: string; priority: string; status: string };
type Project = { id: string; name: string };

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/defects', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([defectsResponse, projectsResponse]) => {
        const [defectsData, projectsData] = await Promise.all([defectsResponse.json(), projectsResponse.json()]);
        if (!defectsResponse.ok) throw new Error(defectsData.error || 'Could not load defects.');
        if (!projectsResponse.ok) throw new Error(projectsData.error || 'Could not load projects.');
        setDefects(defectsData.defects ?? []);
        setProjectNames(Object.fromEntries((projectsData.projects as Project[]).map((project) => [project.id, project.name])));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load defects.'))
      .finally(() => setLoading(false));
  }, []);

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'blocker':
      case 'critical':
        return 'bg-[#f2dede] dark:bg-[#34161a] text-[#a94442] dark:text-[#ff7875] border border-[#ebccd1] dark:border-[#521e24]';
      case 'major':
        return 'bg-[#fcf8e3] dark:bg-[#332711] text-[#8a6d3b] dark:text-[#faad14] border border-[#faebcc] dark:border-[#534019]';
      case 'minor':
        return 'bg-[#e0f2fe] dark:bg-[#112d44] text-[#0369a1] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#1e4d6d]';
      case 'trivial':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'fixed':
      case 'closed':
        return 'bg-[#dff0d8] dark:bg-[#132c1c] text-[#3c763d] dark:text-[#52c41a] border border-[#d6e9c6] dark:border-[#1d4c2b]';
      case 'in_progress':
        return 'bg-[#e0f2fe] dark:bg-[#112d44] text-[#0369a1] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#1e4d6d]';
      case 'open':
      case 'new':
        return 'bg-[#fcf8e3] dark:bg-[#332711] text-[#8a6d3b] dark:text-[#faad14] border border-[#faebcc] dark:border-[#534019]';
      case 'rejected':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 line-through';
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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Defects</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Log, prioritize, and monitor defects discovered during test execution cycles
              </p>
            </div>
            <Link
              href="/defects/new"
              className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors inline-flex items-center gap-1.5 focus:outline-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Defect</span>
            </Link>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-8 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
              Loading defects...
            </div>
          ) : defects.length === 0 ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center shadow-sm">
              <Bug className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No defects reported</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No active bugs or issues found. All test runs are currently executing smoothly!
              </p>
              <Link
                href="/defects/new"
                className="mt-4 inline-flex items-center gap-1.5 bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Log a new defect
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left">
                  <thead className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Key</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Summary</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Severity</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f7] dark:divide-[#222e3e]">
                    {defects.map((defect) => (
                      <tr key={defect.id} className="hover:bg-[#f8fafc] dark:hover:bg-[#1f2c3f] transition-colors">
                        <td className="px-4 py-3 text-xs">
                          <span className="font-mono font-bold text-[#276fbf] dark:text-[#4da3ff] bg-[#eef5fc] dark:bg-[#172739] border border-[#d2e3f5] dark:border-[#233f5d] px-2 py-0.5 rounded cursor-pointer hover:underline">
                            {defect.defect_key}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900 dark:text-white">
                          {defect.summary}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {projectNames[defect.project_id] || 'General'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getSeverityBadge(defect.severity)}`}>
                            {defect.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {defect.priority}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getStatusBadge(defect.status)}`}>
                            {defect.status.replace('_', ' ')}
                          </span>
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
