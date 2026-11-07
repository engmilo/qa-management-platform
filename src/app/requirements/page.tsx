'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, FileText } from 'lucide-react';

type Requirement = { id: string; req_key: string; title: string; project_id: string; type: string; priority: string; status: string };
type Project = { id: string; name: string };

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/requirements', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([requirementsResponse, projectsResponse]) => {
        const [requirementsData, projectsData] = await Promise.all([requirementsResponse.json(), projectsResponse.json()]);
        if (!requirementsResponse.ok) throw new Error(requirementsData.error || 'Could not load requirements.');
        if (!projectsResponse.ok) throw new Error(projectsData.error || 'Could not load projects.');
        setRequirements(requirementsData.requirements ?? []);
        setProjectNames(Object.fromEntries((projectsData.projects as Project[]).map((project) => [project.id, project.name])));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load requirements.'))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'verified':
        return 'bg-[#dff0d8] text-[#3c763d] border border-[#d6e9c6]';
      case 'under_review':
        return 'bg-[#fcf8e3] text-[#8a6d3b] border border-[#faebcc]';
      case 'implemented':
        return 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]';
      case 'rejected':
        return 'bg-[#f2dede] text-[#a94442] border border-[#ebccd1]';
      case 'draft':
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-[#f2dede] text-[#a94442] border border-[#ebccd1]';
      case 'high':
        return 'bg-[#fcf8e3] text-[#8a6d3b] border border-[#faebcc]';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'low':
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
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Requirements</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Define and track functional, security, and performance specifications
              </p>
            </div>
            <Link
              href="/requirements/new"
              className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors inline-flex items-center gap-1.5 focus:outline-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Requirement</span>
            </Link>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white border border-[#d8dee4] rounded-md p-8 text-center text-xs text-slate-500 shadow-sm">
              Loading requirements...
            </div>
          ) : requirements.length === 0 ? (
            <div className="bg-white border border-[#d8dee4] rounded-md p-10 text-center shadow-sm">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No requirements found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add requirements to link them directly to test cases and track test coverage.
              </p>
              <Link
                href="/requirements/new"
                className="mt-4 inline-flex items-center gap-1.5 bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Add your first requirement
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Key</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f7]">
                    {requirements.map((item) => (
                      <tr key={item.id} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="px-4 py-3 text-xs">
                          <span className="font-mono font-bold text-[#276fbf] bg-[#eef5fc] border border-[#d2e3f5] px-2 py-0.5 rounded cursor-pointer hover:underline">
                            {item.req_key}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">
                          {item.title}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {projectNames[item.project_id] || 'General'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 capitalize">
                          {item.type.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getPriorityBadge(item.priority)}`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getStatusBadge(item.status)}`}>
                            {item.status.replace('_', ' ')}
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
