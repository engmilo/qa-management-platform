'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';
import { ArrowLeft, Calendar } from 'lucide-react';

export default function NewTestPlanPage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [form, setForm] = useState({ title: '', scope: '', startDate: '', endDate: '', status: 'planning' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/test-plans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId: project.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the test plan.');
      router.push('/test-plans');
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create the test plan.');
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
              <Link href="/test-plans" className="text-[#276fbf] hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Test Plans
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Add Test Plan</span>
            </div>

            <div className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden mb-6">
              <div className="bg-[#f8fafc] px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#276fbf]/10 text-[#276fbf] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900">Add Test Plan</h1>
                  <p className="text-xs text-slate-500">Group test suites for a milestone, release, or sprint</p>
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

                  <div>
                    <label htmlFor="plan-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Test Plan Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="plan-title"
                      value={form.title}
                      onChange={(event) => setForm({ ...form, title: event.target.value })}
                      placeholder="e.g. Release 2.0 Acceptance Testing"
                      required
                      maxLength={255}
                      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                    />
                  </div>

                  <div>
                    <label htmlFor="plan-scope" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Scope &amp; Description
                    </label>
                    <textarea
                      id="plan-scope"
                      value={form.scope}
                      onChange={(event) => setForm({ ...form, scope: event.target.value })}
                      rows={4}
                      placeholder="Features, test areas, and release criteria included in this plan"
                      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="plan-start" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Start Date
                      </label>
                      <input
                        id="plan-start"
                        type="date"
                        value={form.startDate}
                        onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      />
                    </div>

                    <div>
                      <label htmlFor="plan-end" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        End Date
                      </label>
                      <input
                        id="plan-end"
                        type="date"
                        min={form.startDate || undefined}
                        value={form.endDate}
                        onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      />
                    </div>

                    <div>
                      <label htmlFor="plan-status" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Status
                      </label>
                      <select
                        id="plan-status"
                        value={form.status}
                        onChange={(event) => setForm({ ...form, status: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      >
                        <option value="planning">Planning</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#edf2f7] flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving || !project}
                      className="btn-testrail-primary"
                    >
                      {saving ? 'Saving...' : 'Add Test Plan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/test-plans')}
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
