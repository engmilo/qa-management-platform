'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ArrowLeft, FileSpreadsheet, Download } from 'lucide-react';

const reportTypes = [
  { value: 'projects', label: 'Projects' },
  { value: 'requirements', label: 'Requirements' },
  { value: 'testCases', label: 'Test Cases' },
  { value: 'testPlans', label: 'Test Plans' },
  { value: 'testRuns', label: 'Test Runs' },
  { value: 'defects', label: 'Defects' },
];

type Project = { id: string; key: string; name: string };
type ReportRow = Record<string, unknown>;

function csvValue(value: unknown) {
  const raw = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default function GenerateReportPage() {
  const router = useRouter();
  const [type, setType] = useState('projects');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const requestedType = new URLSearchParams(window.location.search).get('type');
    if (requestedType && reportTypes.some((item) => item.value === requestedType)) setType(requestedType);

    fetch('/api/projects', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load projects.');
        setProjects(data.projects ?? []);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load projects.'))
      .finally(() => setLoadingProjects(false));
  }, []);

  const generate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGenerating(true);
    setError('');
    setMessage('');
    setRows([]);

    try {
      const search = new URLSearchParams({ type });
      if (projectId) search.set('projectId', projectId);
      const response = await fetch(`/api/reports?${search.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not generate this report.');

      const reportRows = (data.rows ?? []) as ReportRow[];
      setRows(reportRows.slice(0, 10));
      if (reportRows.length === 0) {
        setMessage('No records matched those filters.');
        return;
      }

      const columns = Object.keys(reportRows[0]);
      const csv = [columns.map(csvValue).join(','), ...reportRows.map((row) => columns.map((column) => csvValue(row[column])).join(','))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const label = reportTypes.find((item) => item.value === type)?.label.toLowerCase().replace(/\s+/g, '-') || 'report';
      anchor.href = url;
      anchor.download = `qa-${label}-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`Generated ${reportRows.length} rows and downloaded the CSV report.`);
    } catch (generateError: unknown) {
      setError(generateError instanceof Error ? generateError.message : 'Could not generate this report.');
    } finally {
      setGenerating(false);
    }
  };

  const columns = rows[0] ? Object.keys(rows[0]).slice(0, 5) : [];

  return (
    <div className="flex h-screen bg-[#f5f7f9]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb row */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <Link href="/reports" className="text-[#276fbf] hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Reports
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Generate Report</span>
            </div>

            <div className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden mb-6">
              <div className="bg-[#f8fafc] px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#48a43f]/10 text-[#48a43f] flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900">Export QA Report</h1>
                  <p className="text-xs text-slate-500">Filter and download structured CSV test data</p>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={generate} className="space-y-5">
                  <div>
                    <label htmlFor="report-type" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Report Dataset <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="report-type"
                      value={type}
                      onChange={(event) => setType(event.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                    >
                      {reportTypes.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="report-project" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Project Filter
                    </label>
                    <select
                      id="report-project"
                      value={projectId}
                      onChange={(event) => setProjectId(event.target.value)}
                      disabled={loadingProjects}
                      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                    >
                      <option value="">All accessible projects</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.key} — {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div role="alert" className="p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium">
                      {error}
                    </div>
                  )}

                  {message && (
                    <div role="status" className="p-3 bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9] rounded text-xs font-medium flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      <span>{message}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[#edf2f7] flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={generating || loadingProjects}
                      className="btn-testrail-primary"
                    >
                      {generating ? 'Generating...' : 'Download CSV Report'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/reports')}
                      disabled={generating}
                      className="btn-testrail-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {rows.length > 0 && (
                  <section className="mt-8 pt-6 border-t border-[#edf2f7]">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                      Data Preview (First {rows.length} rows)
                    </h2>
                    <div className="overflow-x-auto border border-[#d8dee4] rounded">
                      <table className="w-full text-left">
                        <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                          <tr>
                            {columns.map((column) => (
                              <th key={column} className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf2f7]">
                          {rows.map((row, index) => (
                            <tr key={index} className="hover:bg-[#f8fafc]">
                              {columns.map((column) => (
                                <td key={column} className="px-3 py-2 text-xs text-slate-700 max-w-xs truncate">
                                  {row[column] == null ? '' : typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
