'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';
import { ArrowLeft, FileText } from 'lucide-react';

export default function NewRequirementPage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [form, setForm] = useState({ reqKey: '', title: '', description: '', type: 'functional', priority: 'medium', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId: project.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the requirement.');
      router.push('/requirements');
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create the requirement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Breadcrumb row */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <Link href="/requirements" className="text-[#276fbf] hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Requirements
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Add Requirement</span>
            </div>

            <div className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden mb-6">
              <div className="bg-[#f8fafc] px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#276fbf]/10 text-[#276fbf] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900">Add Requirement</h1>
                  <p className="text-xs text-slate-500">Record a functional or technical requirement specification</p>
                </div>
              </div>

              <div className="p-6">
                {error && (
                  <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Target Project <span className="text-red-500">*</span>
                    </label>
                    <ProjectSelector value={project?.id ?? ''} onChange={setProject} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label htmlFor="req-key" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Requirement Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="req-key"
                        value={form.reqKey}
                        onChange={(event) => setForm({ ...form, reqKey: event.target.value.toUpperCase() })}
                        placeholder="e.g. REQ-101"
                        required
                        maxLength={30}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm font-mono text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="req-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="req-title"
                        value={form.title}
                        onChange={(event) => setForm({ ...form, title: event.target.value })}
                        placeholder="e.g. User Authentication via Two-Factor OTP"
                        required
                        maxLength={255}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="req-description" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Description &amp; Acceptance Criteria
                    </label>
                    <textarea
                      id="req-description"
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      rows={4}
                      placeholder="Detailed requirement scope, acceptance criteria, and edge cases"
                      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="req-type" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Type
                      </label>
                      <select
                        id="req-type"
                        value={form.type}
                        onChange={(event) => setForm({ ...form, type: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      >
                        <option value="functional">Functional</option>
                        <option value="non_functional">Non-functional</option>
                        <option value="business">Business</option>
                        <option value="performance">Performance</option>
                        <option value="security">Security</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="req-priority" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Priority
                      </label>
                      <select
                        id="req-priority"
                        value={form.priority}
                        onChange={(event) => setForm({ ...form, priority: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="req-status" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Status
                      </label>
                      <select
                        id="req-status"
                        value={form.status}
                        onChange={(event) => setForm({ ...form, status: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      >
                        <option value="draft">Draft</option>
                        <option value="under_review">Under review</option>
                        <option value="approved">Approved</option>
                        <option value="implemented">Implemented</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#edf2f7] flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving || !project}
                      className="btn-testrail-primary"
                    >
                      {saving ? 'Saving...' : 'Add Requirement'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/requirements')}
                      disabled={saving}
                      className="btn-testrail-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
