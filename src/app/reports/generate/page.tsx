'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

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
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6"><Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground">← Reports</Link><h1 className="text-2xl font-bold text-foreground mt-2">Generate Report</h1><p className="mt-2 text-sm text-muted-foreground">Export records you can access as a CSV file.</p></div>
            <form onSubmit={generate} className="space-y-5 bg-secondary border border-border rounded-lg p-6">
              <div><label htmlFor="report-type" className="block text-sm font-medium text-foreground mb-2">Report Type</label><select id="report-type" value={type} onChange={(event) => setType(event.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground">{reportTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
              <div><label htmlFor="report-project" className="block text-sm font-medium text-foreground mb-2">Project Filter</label><select id="report-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={loadingProjects} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground"><option value="">All accessible projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.key} — {project.name}</option>)}</select></div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              {message && <p role="status" className="text-sm text-green-500">{message}</p>}
              <div className="flex gap-3"><button type="submit" disabled={generating || loadingProjects} className="px-5 py-2 bg-primary text-white rounded-md disabled:opacity-50">{generating ? 'Generating...' : 'Generate CSV'}</button><button type="button" onClick={() => router.push('/reports')} disabled={generating} className="px-5 py-2 border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50">Cancel</button></div>
            </form>

            {rows.length > 0 && (
              <section className="mt-6 bg-secondary border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Preview (first {rows.length} rows)</h2>
                <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{columns.map((column) => <th key={column} className="p-3 text-xs font-medium text-muted-foreground">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-border">{columns.map((column) => <td key={column} className="p-3 text-xs text-foreground max-w-xs truncate">{row[column] == null ? '' : typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column])}</td>)}</tr>)}</tbody></table></div>
            </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
