'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { FormSelect, DateField, FormActions } from '@/components/ui/form-fields';

type Project = { id: string; name: string };

function extractList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== 'object') return [];
  const keys = ['data', 'projects', 'items', 'results', 'rows'];
  for (const k of keys) {
    const v = (data as any)[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      const nested = extractList(v);
      if (nested.length > 0) return nested;
    }
  }
  for (const v of Object.values(data as any)) {
    if (Array.isArray(v)) return v;
  }
  return [];
}

export default function GenerateReportPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [reportType, setReportType] = useState('summary');
  const [format, setFormat] = useState('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const list = extractList(d).map((r: any) => ({ id: String(r?.id ?? ''), name: String(r?.name ?? r?.title ?? '') })).filter((p) => p.id && p.name);
      setProjects(list); if (list.length > 0) setProjectId(list[0].id);
    }).catch(() => {});
  }, []);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!projectId) { setError('Select a project.'); return; }

    // ONLY NEW CHECK: End must be on/after Start
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        setError('End Date must be on or after Start Date.');
        return;
      }
    }

    setDownloading(true);
    try {
      const qs = new URLSearchParams({
        project_id: projectId,
        projectId: projectId,
        type: reportType,
        format,
        ...(startDate ? { start_date: startDate, startDate } : {}),
        ...(endDate ? { end_date: endDate, endDate } : {}),
      }).toString();
      const res = await fetch(`/api/reports?${qs}`, { cache: 'no-store' });
      let csv = '';
      if (res.ok) {
        const text = await res.text();
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          const rows: any[] = Array.isArray(data) ? data : data?.rows || data?.reports || [];
          csv = 'Project,Report Type,Start Date,End Date\n' +
            `${projects.find((p) => p.id === projectId)?.name || ''},${reportType},${startDate || ''},${endDate || ''}\n\n` +
            (rows.length ? Object.keys(rows[0]).join(',') + '\n' + rows.map((r: any) => Object.values(r).join(',')).join('\n') : 'No rows');
        } else {
          csv = text;
        }
      } else {
        csv = 'Project,Report Type,Start Date,End Date\n' +
          `${projects.find((p) => p.id === projectId)?.name || ''},${reportType},${startDate || ''},${endDate || ''}\n`;
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-xs mb-4">
              <Link href="/reports" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Reports</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">Generate Report</span>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
              <div className="px-6 py-4 dark:border-[#28374d]">
                <h1 className="text-base font-bold text-white tracking-tight text-left m-0">Generate Report</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Export test results for a project and period</p>
              </div>

              <form onSubmit={handleDownload} className="p-6 space-y-4">
                {error && (
                  <div className="p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>
                )}

                <FormSelect
                  label="PROJECT *"
                  value={projectId}
                  onChange={setProjectId}
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Select a project"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect
                    label="REPORT TYPE"
                    value={reportType}
                    onChange={setReportType}
                    options={[
                      { value: 'summary', label: 'summary' },
                      { value: 'detailed', label: 'detailed' },
                      { value: 'test_runs', label: 'test_runs' },
                      { value: 'defects', label: 'defects' },
                      { value: 'traceability', label: 'traceability' },
                    ]}
                  />
                  <FormSelect
                    label="FORMAT"
                    value={format}
                    onChange={setFormat}
                    options={[
                      { value: 'csv', label: 'csv' },
                      { value: 'pdf', label: 'pdf' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DateField label="START DATE" value={startDate} onChange={setStartDate} />
                  <DateField label="END DATE" value={endDate} onChange={setEndDate} />
                </div>

                <FormActions submitLabel="Download CSV Report" saving={downloading} savingLabel="Generating..." cancelHref="/reports" />
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}