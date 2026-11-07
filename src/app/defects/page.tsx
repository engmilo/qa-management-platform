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
        return 'bg-[#f2dede] text-[#a94442] border border-[#ebccd1]';
      case 'major':
        return 'bg-[#fcf8e3] text-[#8a6d3b] border border-[#faebcc]';
      case 'minor':
        return 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]';
      case 'trivial':
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'fixed':
      case 'closed':
        return 'bg-[#dff0d8] text-[#3c763d] border border-[#d6e9c6]';
      case 'in_progress':
        return 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]';
      case 'open':
      case 'new':
        return 'bg-[#fcf8e3] text-[#8a6d3b] border border-[#faebcc]';
      case 'rejected':
        return 'bg-slate-100 text-slate-500 border border-slate-200 line-through';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e2e8f0]">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Defects</h1>
              <p className="text-xs text-slate-500 mt-0.5">
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
            <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white border border-[#d8dee4] rounded-md p-8 text-center text-xs text-slate-500 shadow-sm">
              Loading defects...
            </div>
          ) : defects.length === 0 ? (
            <div className="bg-white border border-[#d8dee4] rounded-md p-10 text-center shadow-sm">
              <Bug className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No defects reported</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
            <div className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left">
                  <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Key</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Summary</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Severity</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f7]">
                    {defects.map((defect) => (
                      <tr key={defect.id} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="px-4 py-3 text-xs">
                          <span className="font-mono font-bold text-[#276fbf] bg-[#eef5fc] border border-[#d2e3f5] px-2 py-0.5 rounded cursor-pointer hover:underline">
                            {defect.defect_key}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">
                          {defect.summary}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {projectNames[defect.project_id] || 'General'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getSeverityBadge(defect.severity)}`}>
                            {defect.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-700 capitalize">
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
