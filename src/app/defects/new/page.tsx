'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { inputCls, FormField, FormSelect, FormActions } from '@/components/ui/form-fields';

type Project = { id: string; name: string };
type TestCase = { id: string; name: string };

function normalizeProjects(data: any): Project[] {
  const rawList: any[] = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : Array.isArray(data?.data) ? data.data : [];
  return rawList.map((raw: any) => ({
    id: String(raw?.id ?? raw?.project_id ?? ''),
    name: String(raw?.name ?? raw?.title ?? raw?.key ?? ''),
  })).filter((p) => p.id && p.name);
}

function normalizeCases(data: any): TestCase[] {
  const rawList: any[] = Array.isArray(data) ? data : Array.isArray(data?.test_cases) ? data.test_cases : Array.isArray(data?.data) ? data.data : [];
  return rawList.map((raw: any) => ({
    id: String(raw?.id ?? ''),
    name: String(raw?.key ? `${raw.key} — ${raw.title || raw.name || ''}` : (raw?.title ?? raw?.name ?? '')),
  })).filter((c) => c.id && c.name);
}

export default function NewDefectPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [projectId, setProjectId] = useState('');
  const [testCaseId, setTestCaseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [severity, setSeverity] = useState('major');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('new');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const list = normalizeProjects(d); setProjects(list); if (list.length > 0) setProjectId(list[0].id);
    }).catch(() => {});
    fetch('/api/test-cases', { cache: 'no-store' }).then((r) => r.json()).then((d) => setCases(normalizeCases(d))).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!projectId) { setError('Select a project.'); return; }
    if (!title.trim()) { setError('Title / Summary is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/defects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          test_case_id: testCaseId || null,
          testCaseId: testCaseId || null,
          title: title.trim(),
          summary: title.trim(),
          description: description.trim(),
          steps_to_reproduce: steps.trim(),
          severity, priority, status,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not create defect.');
      router.push('/defects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create defect.');
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
              <Link href="/defects" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Defects</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">Add Defect</span>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
                <h1 className="text-base font-semibold text-slate-900 dark:text-white">Add Defect</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Report a bug found during testing</p>
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
                    label="LINKED TEST CASE (OPTIONAL)"
                    value={testCaseId}
                    onChange={setTestCaseId}
                    options={cases.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="No test case"
                  />
                </div>

                <FormField label="TITLE / SUMMARY *">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Login fails with valid credentials on Chrome" className={inputCls} />
                </FormField>

                <FormField label="DESCRIPTION">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What happened? What did you expect?" className={`${inputCls} resize-y`} />
                </FormField>

                <FormField label="STEPS TO REPRODUCE">
                  <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} placeholder={"1. Go to login\n2. Enter valid credentials\n3. Click Login"} className={`${inputCls} resize-y`} />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormSelect
                    label="SEVERITY"
                    value={severity}
                    onChange={setSeverity}
                    options={[
                      { value: 'blocker', label: 'blocker' },
                      { value: 'critical', label: 'critical' },
                      { value: 'major', label: 'major' },
                      { value: 'minor', label: 'minor' },
                      { value: 'trivial', label: 'trivial' },
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
                      { value: 'new', label: 'new' },
                      { value: 'open', label: 'open' },
                      { value: 'in_progress', label: 'in_progress' },
                      { value: 'fixed', label: 'fixed' },
                      { value: 'verified', label: 'verified' },
                      { value: 'closed', label: 'closed' },
                    ]}
                  />
                </div>

                <FormActions submitLabel="Add Defect" saving={saving} savingLabel="Adding..." cancelHref="/defects" />
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}