'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { inputCls, FormField, FormSelect } from '@/components/ui/form-fields';
import { AutoGrowTextarea } from '@/components/ui/auto-grow-textarea';

type Project = { id: string; name: string };

function normalizeProjects(data: any): Project[] {
  const rawList: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.projects)
      ? data.projects
      : Array.isArray(data?.data)
        ? data.data
        : [];
  return rawList
    .map((raw: any) => ({
      id: String(raw?.id ?? raw?.project_id ?? ''),
      name: String(raw?.name ?? raw?.title ?? raw?.key ?? raw?.project?.name ?? ''),
    }))
    .filter((p) => p.id && p.name);
}

export default function NewRequirementPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [reqKey, setReqKey] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('functional');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('draft');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const list = normalizeProjects(data);
        setProjects(list);
        if (list.length > 0) setProjectId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!projectId) { setError('Select a project.'); return; }
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!reqKey.trim()) { setError('Requirement Key is required - e.g. REQ-101.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          project_id: projectId,
          reqKey: reqKey.trim().toUpperCase(),
          req_key: reqKey.trim().toUpperCase(),
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          status,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not create requirement.');
      router.push('/requirements');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create requirement.');
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
          <div className="w-full max-w-none">
            <div className="flex items-center gap-2 text-xs mb-4">
              <Link href="/requirements" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Requirements</Link>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-visible">
                <div className="px-6 py-4 dark:border-[#28374d]">
                  <h1 className="text-base font-bold text-white tracking-tight text-left m-0">Add Requirement</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Define what the system must do</p>
                </div>

                <div className="p-6 space-y-4">
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

                  <FormField label="REQUIREMENT KEY *">
                    <input value={reqKey} onChange={(e) => setReqKey(e.target.value)} placeholder="e.g. REQ-101" className={inputCls} />
                  </FormField>

                  <FormField label="TITLE *">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. User can log in with email and password" className={inputCls} />
                  </FormField>

                  <FormField label="DESCRIPTION">
                    <AutoGrowTextarea value={description} onChange={(e) => setDescription(e.target.value)} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} rows={4} placeholder="Detailed description, acceptance criteria, edge cases..." className={`${inputCls} resize-none overflow-hidden`} />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormSelect
                      label="TYPE"
                      value={type}
                      onChange={setType}
                      options={[
                        { value: 'functional', label: 'Functional' },
                        { value: 'non_functional', label: 'Non Functional' },
                        { value: 'business', label: 'Business' },
                        { value: 'technical', label: 'Technical' },
                        { value: 'user_story', label: 'User Story' },
                        { value: 'performance', label: 'Performance' },
                        { value: 'security', label: 'Security' },
                        { value: 'automation', label: 'Automation' },
                        { value: 'regression', label: 'Regression' },
                        { value: 'e2e', label: 'E2E' },
                      ]}
                    />
                    <FormSelect
                      label="PRIORITY"
                      value={priority}
                      onChange={setPriority}
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'critical', label: 'Critical' },
                      ]}
                    />
                    <FormSelect
                      label="STATUS"
                      value={status}
                      onChange={setStatus}
                      options={[
                        { value: 'draft', label: 'Draft' },
                        { value: 'under_review', label: 'Under Review' },
                        { value: 'in_review', label: 'In Review' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'implemented', label: 'Implemented' },
                        { value: 'verified', label: 'Verified' },
                        { value: 'rejected', label: 'Rejected' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 text-xs font-normal bg-green-600 hover:bg-green-700 text-white rounded px-3 py-2.5">{saving ? 'Adding...' : 'Add Requirement'}</button>
                <Link href="/requirements" className="flex-1 text-center text-xs font-normal border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#182232] text-slate-700 dark:text-slate-200 rounded px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
