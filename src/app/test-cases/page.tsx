'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, CheckSquare } from 'lucide-react';

type TestCase = { id: string; case_key: string; title: string; project_id: string; test_type: string; priority: string; automation_status: string };
type Project = { id: string; name: string };

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/test-cases', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([casesResponse, projectsResponse]) => {
        const [casesData, projectsData] = await Promise.all([casesResponse.json(), projectsResponse.json()]);
        if (!casesResponse.ok) throw new Error(casesData.error || 'Could not load test cases.');
        if (!projectsResponse.ok) throw new Error(projectsData.error || 'Could not load projects.');
        setTestCases(casesData.testCases ?? []);
        setProjectNames(Object.fromEntries((projectsData.projects as Project[]).map((project) => [project.id, project.name])));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load test cases.'))
      .finally(() => setLoading(false));
  }, []);

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
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Test Cases</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Test case repository for manual and automated test execution
              </p>
            </div>
            <Link
              href="/test-cases/new"
              className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors inline-flex items-center gap-1.5 focus:outline-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Test Case</span>
            </Link>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white border border-[#d8dee4] rounded-md p-8 text-center text-xs text-slate-500 shadow-sm">
              Loading test cases...
            </div>
          ) : testCases.length === 0 ? (
            <div className="bg-white border border-[#d8dee4] rounded-md p-10 text-center shadow-sm">
              <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No test cases yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Create structured test cases with preconditions, test types, and priorities.
              </p>
              <Link
                href="/test-cases/new"
                className="mt-4 inline-flex items-center gap-1.5 bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Add your first test case
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
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Automation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f7]">
                    {testCases.map((item) => (
                      <tr key={item.id} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="px-4 py-3 text-xs">
                          <span className="font-mono font-bold text-[#276fbf] bg-[#eef5fc] border border-[#d2e3f5] px-2 py-0.5 rounded cursor-pointer hover:underline">
                            {item.case_key}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">
                          {item.title}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {projectNames[item.project_id] || 'General'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 capitalize">
                          {item.test_type}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${getPriorityBadge(item.priority)}`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            item.automation_status === 'automated'
                              ? 'bg-[#dff0d8] text-[#3c763d] border border-[#d6e9c6]'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {item.automation_status.replace('_', ' ')}
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
