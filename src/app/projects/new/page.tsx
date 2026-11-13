'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { inputCls, labelCls, FormField, FormSelect, FormActions } from '@/components/ui/form-fields';

type Org = { id: string; name: string };

// Same normalize as your working Projects page — unchanged
function normalizeOrgs(data: any): Org[] {
  const rawList: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.organizations)
      ? data.organizations
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.orgs)
          ? data.orgs
          : [];
  return rawList
    .map((raw: any) => ({
      id: String(raw?.id ?? raw?.organization_id ?? raw?.org_id ?? raw?.organization?.id ?? ''),
      name: String(
        raw?.name ??
        raw?.organization_name ??
        raw?.title ??
        raw?.label ??
        raw?.organization?.name ??
        raw?.organizations?.name ??
        'Zamir Oy'
      ),
    }))
    .filter((o) => o.name);
}

export default function NewProjectPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([{ id: '', name: 'Zamir Oy' }]);
  const [orgId, setOrgId] = useState('');
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/organizations', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const list = normalizeOrgs(data);
        if (list.length > 0) {
          setOrgs(list);
          setOrgId(list[0].id);
        }
      })
      .catch(() => {
        // Keep fallback "Zamir Oy"
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!key.trim()) { setError('Project Identifier Key is required.'); return; }
    if (!name.trim()) { setError('Project Name is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(orgId ? { organization_id: orgId } : {}),
          key: key.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim(),
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not create project.');
      router.push('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project.');
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
              <Link href="/projects" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Projects</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">Add Project</span>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
              <div className="px-6 py-4 dark:border-[#28374d]">
                <h1 className="text-base font-bold text-white tracking-tight text-left m-0">Add New Project</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Create a repository for your test suites, runs, and cases</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>
                )}

                <FormSelect
                  label="ORGANIZATION *"
                  value={orgId}
                  onChange={setOrgId}
                  options={orgs.map((o) => ({ value: o.id, label: o.name }))}
                />

                <FormField label="PROJECT IDENTIFIER KEY *">
                  <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. MBA, CRM, WEB" className={inputCls} />
                  <p className="text- text-slate-500 dark:text-slate-400 mt-1">Short uppercase prefix for test case numbers (e.g. MBA-C1, MBA-C2)</p>
                </FormField>

                <FormField label="PROJECT NAME *">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mobile Banking App v2" className={inputCls} />
                </FormField>

                <FormField label="ANNOUNCEMENT / DESCRIPTION">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Brief overview of project scope, test environment, and goals" className={`${inputCls} resize-y`} />
                </FormField>

                <FormActions submitLabel="Add Project" saving={saving} savingLabel="Adding..." cancelHref="/projects" />
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}