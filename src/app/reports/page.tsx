'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { BarChart3, Download, Plus, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

type ReportRow = { id: string; name: string; type?: string; project?: string; created_at?: string };

function extractList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== 'object') return [];
  for (const v of Object.values(data as any)) {
    if (Array.isArray(v)) return v;
  }
  return [];
}

function ReportsContent() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    fetch('/api/reports', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const list = extractList(d).map((r: any) => ({
        id: String(r?.id ?? ''),
        name: String(r?.name ?? r?.title ?? r?.type ?? 'Report'),
        type: String(r?.type ?? r?.dataset ?? ''),
        project: String(r?.project?.name ?? r?.project_name ?? r?.project_id ?? ''),
        created_at: String(r?.created_at ?? r?.createdAt ?? ''),
      })).filter((r) => r.id);
      setRows(list);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) => {
    const matchesQ = !q || `${r.name} ${r.type} ${r.project}`.toLowerCase().includes(q.toLowerCase());
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    return matchesQ && matchesType;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const types = ['all', ...Array.from(new Set(rows.map((r) => r.type).filter(Boolean)))];

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#48a43f]" />
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Reports</h1>
              </div>
              <Link href="/reports/generate" className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3 py-2 rounded inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Generate Report</Link>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
              <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-[#e2e8f0] dark:border-[#28374d]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search reports..." className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200" />
                </div>
                <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200">
                  {types.map((t) => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
                </select>
              </div>

              {loading ? (
                <p className="p-6 text-xs text-slate-500">Loading...</p>
              ) : pageRows.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No reports yet.</p>
                  <Link href="/reports/generate" className="text-xs text-[#276fbf] dark:text-[#4da3ff] hover:underline">Generate your first report →</Link>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#f8fafc] dark:bg-[#141d28] text-left text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-2 font-semibold">Name</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                      <th className="px-4 py-2 font-semibold">Project</th>
                      <th className="px-4 py-2 font-semibold">Created</th>
                      <th className="px-4 py-2 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} className="border-t border-[#e2e8f0] dark:border-[#28374d]">
                        <td className="px-4 py-2 font-medium">{r.name}</td>
                        <td className="px-4 py-2">{r.type || '-'}</td>
                        <td className="px-4 py-2">{r.project || '-'}</td>
                        <td className="px-4 py-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2 text-right"><Download className="w-4 h-4 inline text-slate-400" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="p-3 flex items-center justify-between border-t border-[#e2e8f0] dark:border-[#28374d] text-xs">
                <span className="text-slate-500 dark:text-slate-400">{filtered.length} report(s) • Page {safePage} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="border border-[#d8dee4] dark:border-[#28374d] rounded px-2 py-1 disabled:opacity-50">Prev</button>
                  <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="border border-[#d8dee4] dark:border-[#28374d] rounded px-2 py-1 disabled:opacity-50">Next</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}