'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { inputCls, labelCls } from '@/components/ui/form-fields';
import { FolderKanban, ArrowLeft, CheckSquare, PlayCircle, Plus } from 'lucide-react';

type Project = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const [form, setForm] = useState({ key: '', name: '', description: '', orgName: 'Zamir Oy' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({
        key: (project as any)?.key ?? '',
        name: (project as any)?.name ?? '',
        description: (project as any)?.description ?? '',
        orgName: (project as any)?.organization_name ?? (project as any)?.organization?.name ?? (project as any)?.organizations?.name ?? 'Zamir Oy',
      });
    }
  }, [project]);

  useEffect(() => {
    const el = descRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [form.description]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaved(false);
    if (!form.key.trim()) { setError('Project Identifier Key is required.'); return; }
    if (!form.name.trim()) { setError('Project Name is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: form.key.trim().toUpperCase(), name: form.name.trim(), description: form.description.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save project.');
      setProject(data.project ?? { ...project, key: form.key.trim().toUpperCase(), name: form.name.trim(), description: form.description.trim() });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetch(`/api/projects/${encodeURIComponent(projectId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load this project.');
        return result.project as Project;
      })
      .then((result) => { if (active) setProject(result); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load this project.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [projectId]);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Breadcrumb row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Link href="/projects" className="text-[#276fbf] hover:underline flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Projects
                </Link>
                <span>/</span>
                <span className="text-slate-800 font-normal">{project?.name || 'Project Details'}</span>
              </div>
            </div>

            {error ? (
              <section role="alert" className="bg-white border border-red-200 rounded-md p-6 shadow-sm">
                <p className="text-sm font-normal text-red-600">{error}</p>
                <p className="mt-1 text-xs text-slate-500">The project may have been removed or may belong to an organization you cannot access.</p>
              </section>
            ) : project ? (
              <div className="space-y-6">
                {/* Main Project Overview Card */}
                <form onSubmit={save} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                  <div className="px-6 py-4 dark:border-[#28374d]">
                    <h1 className="text-base font-bold text-white tracking-tight text-left m-0">Project Details</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Create a repository for your test suites, runs, and cases</p>
                  </div>
                  <div className="p-6 space-y-5">
                    {saved && <div className="p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">Saved.</div>}
                    <div>
                      <label className={labelCls}>ORGANIZATION *</label>
                      <input value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>PROJECT IDENTIFIER KEY *</label>
                      <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })} placeholder="e.g. MBA, CRM, WEB" className={inputCls} />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Short uppercase prefix for test case numbers (e.g. MBA-C1, MBA-C2)</p>
                    </div>
                    <div>
                      <label className={labelCls}>PROJECT NAME *</label>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mobile Banking App v2" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>ANNOUNCEMENT / DESCRIPTION</label>
                      <textarea ref={descRef} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief overview of project scope, test environment, and goals" rows={4} style={{ overflow: 'hidden' }} className={`${inputCls} resize-none overflow-hidden`} />
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-[#e2e8f0] dark:border-[#28374d]">
                      <button type="submit" disabled={saving} className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-sm font-normal px-4 py-2 rounded disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                      <Link href="/projects" className="bg-white dark:bg-[#1e2a3a] border border-[#d8dee4] dark:border-[#28374d] hover:bg-slate-50 dark:hover:bg-[#28374d] text-slate-700 dark:text-slate-200 text-sm font-normal px-4 py-2 rounded">Cancel</Link>
                    </div>
                    <div className="flex items-center gap-2 text- text-slate-400">
                        <span>Created on {project ? new Date(project.created_at).toLocaleDateString() : ''}</span>
                        <span>·</span>
                        <span>Status:</span>
                        <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize font-normal text-xs">{project?.status ?? 'Active'}</span>
                      </div>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}