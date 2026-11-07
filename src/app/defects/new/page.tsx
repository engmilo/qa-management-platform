'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';
import { ArrowLeft, Bug } from 'lucide-react';

export default function NewDefectPage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [form, setForm] = useState({ defectKey: '', summary: '', description: '', severity: 'major', priority: 'medium', environment: '', stepsToReproduce: '', expectedResult: '', actualResult: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/defects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId: project.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not report the defect.');
      router.push('/defects');
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not report the defect.');
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
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb row */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <Link href="/defects" className="text-[#276fbf] hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Defects
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Add Defect</span>
            </div>

            <div className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden mb-6">
              <div className="bg-[#f8fafc] px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-red-50 text-red-600 flex items-center justify-center">
                  <Bug className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900">Report Defect</h1>
                  <p className="text-xs text-slate-500">Record an issue, steps to reproduce, and impact details</p>
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
                      <label htmlFor="defect-key" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Defect Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="defect-key"
                        value={form.defectKey}
                        onChange={(event) => setForm({ ...form, defectKey: event.target.value.toUpperCase() })}
                        placeholder="e.g. BUG-101"
                        required
                        maxLength={30}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm font-mono text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="defect-summary" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Summary <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="defect-summary"
                        value={form.summary}
                        onChange={(event) => setForm({ ...form, summary: event.target.value })}
                        placeholder="e.g. Session expires immediately when switching tabs"
                        required
                        maxLength={255}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="defect-description" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Description / Overview
                    </label>
                    <textarea
                      id="defect-description"
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      rows={3}
                      placeholder="High level overview of what broke and under what circumstances"
                      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="defect-severity" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Severity
                      </label>
                      <select
                        id="defect-severity"
                        value={form.severity}
                        onChange={(event) => setForm({ ...form, severity: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      >
                        <option value="trivial">Trivial</option>
                        <option value="minor">Minor</option>
                        <option value="major">Major</option>
                        <option value="critical">Critical</option>
                        <option value="blocker">Blocker</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="defect-priority" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Priority
                      </label>
                      <select
                        id="defect-priority"
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
                      <label htmlFor="defect-environment" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Environment
                      </label>
                      <input
                        id="defect-environment"
                        value={form.environment}
                        onChange={(event) => setForm({ ...form, environment: event.target.value })}
                        placeholder="e.g. Staging / iOS 17 Safari"
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="defect-steps" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Steps to Reproduce
                    </label>
                    <textarea
                      id="defect-steps"
                      value={form.stepsToReproduce}
                      onChange={(event) => setForm({ ...form, stepsToReproduce: event.target.value })}
                      rows={3}
                      placeholder="1. Navigate to...&#10;2. Click on...&#10;3. Observe error..."
                      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="defect-expected" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Expected Result
                      </label>
                      <textarea
                        id="defect-expected"
                        value={form.expectedResult}
                        onChange={(event) => setForm({ ...form, expectedResult: event.target.value })}
                        rows={2}
                        placeholder="What should have happened"
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                      />
                    </div>

                    <div>
                      <label htmlFor="defect-actual" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Actual Result
                      </label>
                      <textarea
                        id="defect-actual"
                        value={form.actualResult}
                        onChange={(event) => setForm({ ...form, actualResult: event.target.value })}
                        rows={2}
                        placeholder="What actually occurred"
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#edf2f7] flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving || !project}
                      className="btn-testrail-primary"
                    >
                      {saving ? 'Saving...' : 'Add Defect'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/defects')}
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
