'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { inputCls, FormField, FormSelect, DateField, FormActions } from '@/components/ui/form-fields';

type Project = { id: string; name: string };
type Milestone = { id: string; name: string };

function extractList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== 'object') return [];
  const keys = ['data', 'projects', 'milestones', 'test_plans', 'plans', 'items', 'results', 'rows'];
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

export default function NewTestPlanPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projectId, setProjectId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const list = extractList(d).map((r: any) => ({ id: String(r?.id ?? ''), name: String(r?.name ?? r?.title ?? '') })).filter((p) => p.id && p.name);
      setProjects(list); if (list.length > 0) setProjectId(list[0].id);
    }).catch(() => {});
    fetch('/api/milestones', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const list = extractList(d).map((r: any) => ({ id: String(r?.id ?? ''), name: String(r?.name ?? r?.title ?? '') })).filter((m) => m.id && m.name);
      setMilestones(list);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!projectId) { setError('Select a project.'); return; }
    if (!name.trim()) { setError('Test Plan Name is required.'); return; }

    // Date check — unchanged, already proved working
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        setError('End Date must be on or after Start Date.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/test-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // FIX: API expects camelCase title / scope / projectId / releaseId (same as PATCH)
          // Send both namings so it passes either way
          projectId: projectId,
          project_id: projectId,
          title: name.trim(),
          name: name.trim(),
          scope: description.trim(),
          description: description.trim(),
          status,
          startDate: startDate || null,
          start_date: startDate || null,
          endDate: endDate || null,
          end_date: endDate || null,
          releaseId: milestoneId || null,
          release_id: milestoneId || null,
          milestoneId: milestoneId || null,
          milestone_id: milestoneId || null,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not create test plan.');
      router.push('/test-plans');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create test plan.');
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
              <Link href="/test-plans" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Test Plans</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">Add Test Plan</span>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
              <div className="px-6 py-4 dark:border-[#28374d]">
                <h1 className="text-2xl font-bold text-white tracking-tight text-left m-0">Add Test Plan</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Plan a set of test cases for a release</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

                <FormSelect
                  label="MILESTONE (OPTIONAL)"
                  value={milestoneId}
                  onChange={setMilestoneId}
                  options={milestones.map((m) => ({ value: m.id, label: m.name }))}
                  placeholder="No milestone"
                />

                <FormField label="TEST PLAN NAME *">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Smoke Test — Build 1.0.4" className={inputCls} />
                </FormField>

                <FormField label="DESCRIPTION">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What will this plan cover?" className={`${inputCls} resize-y`} />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormSelect
                    label="STATUS"
                    value={status}
                    onChange={setStatus}
                    options={[
                      { value: 'active', label: 'active' },
                      { value: 'draft', label: 'draft' },
                      { value: 'planning', label: 'planning' },
                      { value: 'in_progress', label: 'in_progress' },
                      { value: 'completed', label: 'completed' },
                      { value: 'archived', label: 'archived' },
                    ]}
                  />
                  <DateField label="START DATE" value={startDate} onChange={setStartDate} />
                  <DateField label="END DATE" value={endDate} onChange={setEndDate} />
                </div>

                <FormActions submitLabel="Add Test Plan" saving={saving} savingLabel="Adding..." cancelHref="/test-plans" />
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}