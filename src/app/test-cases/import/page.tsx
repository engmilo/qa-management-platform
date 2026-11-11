'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ArrowLeft, Upload, Download } from 'lucide-react';

type Project = { id: string; name: string };
type ParsedRow = { case_key: string; title: string; test_type: string; priority: string; category: string; automation_status: string; description: string; preconditions: string; estimate_minutes: string; tags: string; status: 'new' | 'duplicate' | 'invalid' };

// CSV parser — handles "quoted, fields", "" escaped quotes, newlines inside quotes
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') { /* ignore */ }
      else cur += c;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export default function ImportTestCasesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ added: number; skipped: string[]; errors: { key: string; error: string }[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' }).then(async (r) => {
      const d = await r.json();
      if (r.ok) setProjects(d.projects ?? []);
    }).finally(() => setLoadingProjects(false));
  }, []);

  // Existing keys for selected project — to mark duplicates in preview
  useEffect(() => {
    if (!projectId) { setExistingKeys(new Set()); return; }
    fetch(`/api/test-cases?projectId=${projectId}`, { cache: 'no-store' }).then(async (r) => {
      const d = await r.json();
      if (r.ok) setExistingKeys(new Set((d.testCases ?? []).map((c: any) => String(c.case_key).trim().toLowerCase())));
    }).catch(() => {});
  }, [projectId]);

  // Re-classify rows when project changes
  useEffect(() => {
    if (!rows.length) return;
    setRows((cur) => cur.map((r) => {
      if (!r.case_key || !r.title) return { ...r, status: 'invalid' as const };
      return { ...r, status: existingKeys.has(r.case_key.toLowerCase()) ? 'duplicate' as const : 'new' as const };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingKeys]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setResult(null); setFileName(file.name);
    try {
      const text = await file.text();
      const all = parseCsv(text);
      if (!all.length) throw new Error('File is empty.');
      const header = all[0].map((h) => h.trim().toLowerCase());
      const idx = (name: string) => header.indexOf(name);
      // Support both Export header (Key, Title...) and simple header (case_key, title...)
      const get = (row: string[], ...names: string[]) => {
        for (const n of names) { const i = idx(n); if (i >= 0) return row[i] ?? ''; }
        return '';
      };
      const parsed: ParsedRow[] = all.slice(1).map((row) => {
        const key = get(row, 'key', 'case_key').trim();
        const title = get(row, 'title').trim();
        const r: ParsedRow = {
          case_key: key,
          title,
          test_type: get(row, 'type', 'test_type').trim() || 'functional',
          priority: get(row, 'priority').trim() || 'medium',
          category: get(row, 'category').trim() || 'General',
          automation_status: get(row, 'automation', 'automation_status').trim() || 'manual',
          description: get(row, 'description'),
          preconditions: get(row, 'preconditions'),
          estimate_minutes: get(row, 'estimate (min)', 'estimate_minutes', 'estimate').trim(),
          tags: get(row, 'tags'),
          status: 'new',
        };
        if (!key || !title) r.status = 'invalid';
        else if (existingKeys.has(key.toLowerCase())) r.status = 'duplicate';
        return r;
      });
      setRows(parsed);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not read file.'); }
  };

  const counts = useMemo(() => ({
    total: rows.length,
    nNew: rows.filter((r) => r.status === 'new').length,
    dup: rows.filter((r) => r.status === 'duplicate').length,
    invalid: rows.filter((r) => r.status === 'invalid').length,
  }), [rows]);

  const doImport = async () => {
    if (!projectId) { setError('Select a project first.'); return; }
    const toImport = rows.filter((r) => r.status === 'new');
    if (!toImport.length) { setError('No new cases to import.'); return; }
    setImporting(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/test-cases/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          cases: toImport.map((r) => ({
            case_key: r.case_key,
            title: r.title,
            test_type: r.test_type,
            priority: r.priority,
            category: r.category,
            automation_status: r.automation_status,
            description: r.description,
            preconditions: r.preconditions,
            estimate_minutes: r.estimate_minutes === '' ? null : Number(r.estimate_minutes),
            tags: r.tags ? r.tags.split(';').map((t) => t.trim()).filter(Boolean) : [],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');
      setResult(data);
      // Mark imported as duplicate now, so second click doesn't re-add
      setRows((cur) => cur.map((r) => r.status === 'new' ? { ...r, status: 'duplicate' as const } : r));
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed.'); }
    finally { setImporting(false); }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
              <Link href="/test-cases" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Test Cases</Link>
              <span>/</span><span className="text-slate-800 dark:text-slate-200 font-medium">Import CSV</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Import Test Cases</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">Same format as Export. Preview first — duplicates are skipped, nothing is overwritten or deleted.</p>

            {error && <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
            {result && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">
                Import done — <b>{result.added} added</b>, {result.skipped.length} skipped (duplicate).
                {result.errors.length > 0 && <div className="mt-1">{result.errors.map((e, i) => <div key={i}>{e.key}: {e.error}</div>)}</div>}
                <Link href="/test-cases" className="underline font-semibold ml-1">Go to Test Cases →</Link>
              </div>
            )}

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5 space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1.5">1. Target Project *</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white">
                  <option value="">{loadingProjects ? 'Loading projects...' : 'Select a project'}</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <p className="text- text-slate-400 mt-1">Duplicates are checked only inside this project.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1.5">2. CSV File *</label>
                <label className="flex items-center gap-2 border border-dashed border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1f2c3f]">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>{fileName || 'Choose a CSV file — use Export to get the template'}</span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
                <a href="/test-cases" className="text- text-[#276fbf] dark:text-[#4da3ff] hover:underline inline-flex items-center gap-1 mt-2"><Download className="w-3 h-3" /> Get template via Export CSV on Test Cases page</a>
              </div>
            </div>

            {rows.length > 0 && (
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-[#e2e8f0] dark:border-[#28374d]">
                  <h3 className="text-sm font-bold">Preview</h3>
                  <span className="text-xs text-slate-500">{counts.total} rows · <span className="text-[#48a43f] font-semibold">{counts.nNew} new</span> · <span className="text-amber-600">{counts.dup} duplicate (will skip)</span> · <span className="text-red-600">{counts.invalid} invalid</span></span>
                  <button onClick={doImport} disabled={importing || !projectId || counts.nNew === 0} className="ml-auto bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded">{importing ? 'Importing...' : `Import ${counts.nNew} new cases`}</button>
                </div>
                <div className="overflow-x-auto max-h- overflow-y-auto">
                  <table className="w-full min-w- text-left">
                    <thead className="bg-[#f8fafc] dark:bg-[#141d28] border-b"><tr>
                      <th className="px-4 py-2 text- font-bold text-slate-500 uppercase">Key</th>
                      <th className="px-4 py-2 text- font-bold text-slate-500 uppercase">Title</th>
                      <th className="px-4 py-2 text- font-bold text-slate-500 uppercase">Type / Priority</th>
                      <th className="px-4 py-2 text- font-bold text-slate-500 uppercase">Status</th>
                    </tr></thead>
                    <tbody className="divide-y divide-[#edf2f7] dark:divide-[#222e3e]">
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-xs font-mono font-bold text-[#276fbf]">{r.case_key || '—'}</td>
                          <td className="px-4 py-2 text-xs font-medium">{r.title || '—'}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{r.test_type} · {r.priority}</td>
                          <td className="px-4 py-2 text-xs">
                            {r.status === 'new' && <span className="bg-[#dff0d8] text-[#3c763d] px-2 py-0.5 rounded-full text- font-semibold">New</span>}
                            {r.status === 'duplicate' && <span className="bg-[#fcf8e3] text-[#8a6d3b] px-2 py-0.5 rounded-full text- font-semibold">Duplicate — will skip</span>}
                            {r.status === 'invalid' && <span className="bg-[#f2dede] text-[#a94442] px-2 py-0.5 rounded-full text- font-semibold">Invalid — missing Key/Title</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}