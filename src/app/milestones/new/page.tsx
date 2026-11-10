'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { inputCls, FormField, FormSelect, DateField, FormActions } from '@/components/ui/form-fields';

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

export default function NewMilestonePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [versionName, setVersionName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [startDate, setStartDate] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const list = extractList(d).map((r: any) => ({ id: String(r?.id ?? ''), name: String(r?.name ?? r?.title ?? '') })).filter((p) => p.id && p.name);
      setProjects(list); if (list.length > 0) setProjectId(list[0].id);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!projectId) { setError('Select a target project.'); return; }
    if (!versionName.trim()) { setError('Version Name is required.'); return; }

    // ONLY NEW CHECK: Release must be on/after Start
    if (startDate && releaseDate) {
      const start = new Date(startDate);
      const release = new Date(releaseDate);
      if (!isNaN(start.getTime()) && !isNaN(release.getTime()) && release < start) {
        setError('Release Date must be on or after Start Date.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // API expects camelCase (same as PATCH) — send both namings
          projectId: projectId,
          project_id: projectId,
          versionName: versionName.trim(),
          version_name: versionName.trim(),
          version: versionName.trim(),
          name: versionName.trim(),
          description: description.trim(),
          status,
          startDate: startDate || null,
          start_date: startDate || null,
          releaseDate: releaseDate || null,
          release_date: releaseDate || null,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not create milestone.');
      router.push('/milestones');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create milestone.');
    } finally {
      setSaving(false);
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
              <Link href="/milestones" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Milestones</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">Add Milestone</span>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
                <h1 className="text-base font-semibold text-slate-900 dark:text-white">Add Milestone</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">A release version to group test plans</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>
                )}

                <FormSelect
                  label="TARGET PROJECT *"
                  value={projectId}
                  onChange={setProjectId}
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Select a project"
                />

                <FormField label="VERSION NAME *">
                  <input value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="e.g. 1.0.5" className={inputCls} />
                </FormField>

                <FormField label="DESCRIPTION">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is in this release?" className={`${inputCls} resize-y`} />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormSelect
                    label="STATUS"
                    value={status}
                    onChange={setStatus}
                    options={[
                      { value: 'planning', label: 'planning' },
                      { value: 'in_progress', label: 'in_progress' },
                      { value: 'released', label: 'released' },
                      { value: 'archived', label: 'archived' },
                    ]}
                  />
                  <DateField label="START DATE" value={startDate} onChange={setStartDate} />
                  <DateField label="RELEASE DATE" value={releaseDate} onChange={setReleaseDate} />
                </div>

                <FormActions submitLabel="Create Milestone" saving={saving} savingLabel="Creating..." cancelHref="/milestones" />
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}