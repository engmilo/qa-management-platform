'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { inputCls, labelCls, FormField, FormSelect, FormActions } from '@/components/ui/form-fields';

type Project = { id: string; name: string };
type Plan = { id: string; name: string };
type Requirement = { id: string; name: string };

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

function normalizeReqs(data: any): Requirement[] {
  const rawList: any[] = Array.isArray(data) ? data : Array.isArray(data?.requirements) ? data.requirements : Array.isArray(data?.data) ? data.data : [];
  return rawList.map((raw: any) => ({
    id: String(raw?.id ?? ''),
    name: String(raw?.key ? `${raw.key} — ${raw.title || raw.name || ''}` : (raw?.title ?? raw?.name ?? '')),
  })).filter((r) => r.id && r.name);
}

export default function NewTestCasePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [projectId, setProjectId] = useState('');
  const [planId, setPlanId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [type, setType] = useState('functional');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('draft');
  const [selectedReqs, setSelectedReqs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const list = normalizeProjects(d); setProjects(list); if (list.length > 0) setProjectId(list[0].id);
    }).catch(() => {});
    fetch('/api/test-plans', { cache: 'no-store' }).then((r) => r.json()).then((d) => setPlans(normalizePlans(d))).catch(() => {});
    fetch('/api/requirements', { cache: 'no-store' }).then((r) => r.json()).then((d) => setRequirements(normalizeReqs(d))).catch(() => {});
  }, []);

  const toggleReq = (id: string) => {
    setSelectedReqs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!projectId) { setError('Select a project.'); return; }
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    try {
      const steps = stepsText.split('\n').map((s) => s.trim()).filter(Boolean).map((line, i) => ({
        step_number: i + 1, action: line, expected_result: '',
      }));
      const res = await fetch('/api/test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          test_plan_id: planId || null,
          title: title.trim(),
          description: description.trim(),
          preconditions: preconditions.trim(),
          steps,
          type, priority, status,
          requirement_ids: selectedReqs,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not create test case.');
      router.push('/test-cases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create test case.');
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
              <Link href="/test-cases" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Test Cases</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">Add Test Case</span>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
                <h1 className="text-base font-semibold text-slate-900 dark:text-white">Add Test Case</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Define steps to verify a requirement</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>

                <FormField label="TITLE *">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Verify login with valid credentials" className={inputCls} />
                </FormField>

                <FormField label="DESCRIPTION">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What does this test verify?" className={`${inputCls} resize-y`} />
                </FormField>

                <FormField label="PRECONDITIONS">
                  <textarea value={preconditions} onChange={(e) => setPreconditions(e.target.value)} rows={2} placeholder="e.g. User account exists, app is on login page" className={`${inputCls} resize-y`} />
                </FormField>

                <FormField label="STEPS (ONE PER LINE)">
                  <textarea value={stepsText} onChange={(e) => setStepsText(e.target.value)} rows={4} placeholder={"1. Navigate to login page\n2. Enter valid email and password\n3. Click Login"} className={`${inputCls} resize-y`} />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormSelect
                    label="TYPE"
                    value={type}
                    onChange={setType}
                    options={[
                      { value: 'functional', label: 'functional' },
                      { value: 'regression', label: 'regression' },
                      { value: 'smoke', label: 'smoke' },
                      { value: 'integration', label: 'integration' },
                      { value: 'ui', label: 'ui' },
                      { value: 'api', label: 'api' },
                    ]}
                  />
                  <FormSelect
                    label="PRIORITY"
                    value={priority}
                    onChange={setPriority}
                    options={[
                      { value: 'low', label: 'low' },
                      { value: 'medium', label: 'medium' },
                      { value: 'high', label: 'high' },
                      { value: 'critical', label: 'critical' },
                    ]}
                  />
                  <FormSelect
                    label="STATUS"
                    value={status}
                    onChange={setStatus}
                    options={[
                      { value: 'draft', label: 'draft' },
                      { value: 'ready', label: 'ready' },
                      { value: 'in_review', label: 'in_review' },
                      { value: 'approved', label: 'approved' },
                      { value: 'archived', label: 'archived' },
                    ]}
                  />
                </div>

                {/* Linked Requirements — stacked, no overlap */}
                <div>
                  <span className={labelCls}>LINKED REQUIREMENTS</span>
                  <div className="border border-[#d8dee4] dark:border-[#28374d] rounded bg-white dark:bg-[#101622] max-h-40 overflow-y-auto p-2 space-y-1">
                    {requirements.length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-1">No requirements found for this project.</p>
                    )}
                    {requirements.map((r) => (
                      <label key={r.id} className="flex items-start gap-2 px-1 py-1 rounded hover:bg-slate-50 dark:hover:bg-[#1e2a3a] cursor-pointer">
                        <input type="checkbox" checked={selectedReqs.includes(r.id)} onChange={() => toggleReq(r.id)} className="mt-0.5 accent-[#48a43f]" />
                        <span className="text-xs text-slate-700 dark:text-slate-200 leading-4">{r.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedReqs.length > 0 && (
                    <p className="text- text-slate-500 dark:text-slate-400 mt-1">{selectedReqs.length} requirement(s) selected</p>
                  )}
                </div>

                <FormActions submitLabel="Add Test Case" saving={saving} savingLabel="Adding..." cancelHref="/test-cases" />
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}