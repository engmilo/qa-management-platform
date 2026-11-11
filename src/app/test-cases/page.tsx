'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, CheckSquare, Download, Upload } from 'lucide-react';

type TestCase = { id: string; case_key: string; title: string; project_id: string; test_type: string; priority: string; automation_status: string; description?: string | null; preconditions?: string | null; category?: string | null; estimate_minutes?: number | null; tags?: string[] | null; created_at?: string | null };
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
        return 'bg-[#f2dede] dark:bg-[#34161a] text-[#a94442] dark:text-[#ff7875] border border-[#ebccd1] dark:border-[#521e24]';
      case 'high':
        return 'bg-[#fcf8e3] dark:bg-[#332711] text-[#8a6d3b] dark:text-[#faad14] border border-[#faebcc] dark:border-[#534019]';
      case 'medium':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900';
      case 'low':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  // EXPORT — client-side only, reads already-loaded cases, downloads CSV. No API, no DB.
  const exportCsv = () => {
    if (!testCases.length) return;
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ['Key', 'Title', 'Project', 'Type', 'Priority', 'Category', 'Automation', 'Description', 'Preconditions', 'Estimate (min)', 'Tags', 'Created At'];
    const rows = testCases.map((c) => [
      c.case_key,
      c.title,
      projectNames[c.project_id] || '',
      c.test_type,
      c.priority,
      c.category || '',
      c.automation_status,
      c.description || '',
      c.preconditions || '',
      c.estimate_minutes ?? '',
      (c.tags ?? []).join('; '),
      c.created_at ? new Date(c.created_at).toLocaleString() : '',
    ]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Test Cases</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Test case repository for manual and automated test execution
              </p>
            </div>
            <div className="flex gap-2">
  <button onClick={exportCsv} disabled={loading || testCases.length === 0} className="bg-[#276fbf] hover:bg-[#1e5a9e] disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors inline-flex items-center gap-1.5 focus:outline-none">
    <Download className="w-4 h-4" />
    <span>Export CSV</span>
  </button>
  <Link href="/test-cases/import" className="bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 border border-[#d8dee4] dark:border-[#28374d] text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors inline-flex items-center gap-1.5">
    <Upload className="w-4 h-4" />
    <span>Import CSV</span>
  </Link>
  <Link href="/test-cases/new" className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors inline-flex items-center gap-1.5 focus:outline-none">
    <Plus className="w-4 h-4 stroke-[2.5]" />
    <span>Add Test Case</span>
  </Link>

            </div>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-8 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
              Loading test cases...
            </div>
          ) : testCases.length === 0 ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center shadow-sm">
              <CheckSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No test cases yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
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
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w- text-left">
                  <thead className="bg-[#f8fafc] dark:bg-[#141d28] border-b border-[#e2e8f0] dark:border-[#28374d]">
                    <tr>
                      <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Key</th>
                      <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text- font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Automation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f7] dark:divide-[#222e3e]">
                    {testCases.map((item) => (
                      <tr key={item.id} className="hover:bg-[#f8fafc] dark:hover:bg-[#1f2c3f] transition-colors">
                        <td className="px-4 py-3 text-xs">
                          <Link href={`/test-cases/${item.id}`} className="font-mono font-bold text-[#276fbf] dark:text-[#4da3ff] bg-[#eef5fc] dark:bg-[#172739] border border-[#d2e3f5] dark:border-[#233f5d] px-2 py-0.5 rounded hover:underline">
                            {item.case_key}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-900 dark:text-white">
                          <Link href={`/test-cases/${item.id}`} className="hover:underline">
                            {item.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {projectNames[item.project_id] || 'General'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 capitalize">
                          {item.test_type}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block text- font-semibold px-2 py-0.5 rounded-full capitalize ${getPriorityBadge(item.priority)}`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-block text- font-semibold px-2 py-0.5 rounded-full capitalize ${
                            item.automation_status === 'automated'
                              ? 'bg-[#dff0d8] dark:bg-[#132c1c] text-[#3c763d] dark:text-[#52c41a] border border-[#d6e9c6] dark:border-[#1d4c2b]'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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