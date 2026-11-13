'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { inputCls, FormField, FormSelect, FormActions } from '@/components/ui/form-fields';

type Project = { id: string; name: string };
type Plan = { id: string; name: string };

function normalizeProjects(data: any): Project[] {
  const rawList: any[] = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : Array.isArray(data?.data) ? data.data : [];
  return rawList.map((raw: any) => ({
    id: String(raw?.id ?? raw?.project_id ?? ''),
    name: String(raw?.name ?? raw?.title ?? raw?.key ?? ''),
  })).filter((p) => p.id && p.name);
}

function normalizePlans(data: any): Plan[] {
  const rawList: any[] = Array.isArray(data) ? data : Array.isArray(data?.test_plans) ? data.test_plans : Array.isArray(data?.data) ? data.data : [];
  return rawList.map((raw: any) => ({
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? raw?.title ?? ''),
  })).filter((p) => p.id && p.name);
}

export default function NewTestSuitePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [projectId, setProjectId] = useState('');
  const [planId, setPlanId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const list = normalizeProjects(d); setProjects(list); if (list.length > 0) setProjectId(list[0].id);
    }).catch(() => {});
    fetch('/api/test-plans', { cache: 'no-store' }).then((r) => r.json()).then((d) => setPlans(normalizePlans(d))).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!projectId) { setError('Select a project.'); return; }
    if (!name.trim()) { setError('Suite Name is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/test-suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          test_plan_id: planId || null,
          testPlanId: planId || null,
          name: name.trim(),
          description: description.trim(),
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not create test suite.');
      router.push('/test-suites');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create test suite.');
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
              <Link href="/test-suites" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Test Suites</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">Add Test Suite</span>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
              <div className="px-6 py-4 dark:border-[#28374d]">
                <h1 className="text-base font-bold text-white tracking-tight text-left m-0">Add Test Suite</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Group test cases inside a test plan</p>
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
                  label="TEST PLAN (OPTIONAL)"
                  value={planId}
                  onChange={setPlanId}
                  options={plans.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="No test plan"
                />

                <FormField label="SUITE NAME *">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Login & Authentication" className={inputCls} />
                </FormField>

                <FormField label="DESCRIPTION">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What does this suite cover?" className={`${inputCls} resize-y`} />
                </FormField>

                <FormActions submitLabel="Add Test Suite" saving={saving} savingLabel="Adding..." cancelHref="/test-suites" />
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}