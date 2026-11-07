'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';
import { ArrowLeft, CheckSquare } from 'lucide-react';

type RequirementOption = { id: string; req_key: string; title: string };

export default function NewTestCasePage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [requirementIds, setRequirementIds] = useState<string[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [requirementsError, setRequirementsError] = useState('');
  const [form, setForm] = useState({ caseKey: '', title: '', description: '', preconditions: '', testType: 'functional', priority: 'medium', category: 'General', automationStatus: 'manual' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setRequirements([]);
    setRequirementIds([]);
    setRequirementsError('');
    setLoadingRequirements(false);

    if (!project?.id) return () => { active = false; };

    setLoadingRequirements(true);
    fetch(`/api/requirements?projectId=${encodeURIComponent(project.id)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load project requirements.');
        return data as { requirements: RequirementOption[] };
      })
      .then((data) => {
        if (active) setRequirements(data.requirements ?? []);
      })
      .catch((loadError: unknown) => {
        if (active) setRequirementsError(loadError instanceof Error ? loadError.message : 'Could not load project requirements.');
      })
      .finally(() => {
        if (active) setLoadingRequirements(false);
      });

    return () => { active = false; };
  }, [project?.id]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/test-cases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId: project.id, requirementIds }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the test case.');
      router.push('/test-cases');
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create the test case.');
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
              <Link href="/test-cases" className="text-[#276fbf] hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Test Cases
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Add Test Case</span>
            </div>

            <div className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden mb-6">
              <div className="bg-[#f8fafc] px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#48a43f]/10 text-[#48a43f] flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900">Add Test Case</h1>
                  <p className="text-xs text-slate-500">Define test steps, preconditions, type, and priorities</p>
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
                      Project <span className="text-red-500">*</span>
                    </label>
                    <ProjectSelector value={project?.id ?? ''} onChange={setProject} />
                  </div>

                  <fieldset className="p-3.5 rounded border border-[#d8dee4] bg-[#f8fafc]/50 space-y-2">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-slate-700 px-1">
                      Linked Requirements <span className="font-normal text-slate-400 lowercase">(optional)</span>
                    </legend>
                    {!project ? (
                      <p className="text-xs text-slate-400">Select a project to see its requirements.</p>
                    ) : loadingRequirements ? (
                      <p className="text-xs text-slate-400">Loading requirements…</p>
                    ) : requirementsError ? (
                      <p role="alert" className="text-xs text-red-500 font-medium">{requirementsError}</p>
                    ) : requirements.length ? (
                      <div className="max-h-40 space-y-2 overflow-y-auto rounded border border-[#d8dee4] bg-white p-2.5">
                        {requirements.map((requirement) => (
                          <label key={requirement.id} className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-700 hover:text-slate-900">
                            <input
                              type="checkbox"
                              checked={requirementIds.includes(requirement.id)}
                              onChange={(event) => setRequirementIds((selected) => event.target.checked
                                ? [...selected, requirement.id]
                                : selected.filter((id) => id !== requirement.id))}
                              className="mt-0.5 accent-[#48a43f]"
                            />
                            <span>
                              <span className="mr-1.5 font-mono font-bold text-[#276fbf]">{requirement.req_key}</span>
                              {requirement.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">This project has no requirements to link yet.</p>
                    )}
                  </fieldset>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label htmlFor="case-key" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Case Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="case-key"
                        value={form.caseKey}
                        onChange={(event) => setForm({ ...form, caseKey: event.target.value.toUpperCase() })}
                        placeholder="e.g. TC-101"
                        required
                        maxLength={30}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm font-mono text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="case-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="case-title"
                        value={form.title}
                        onChange={(event) => setForm({ ...form, title: event.target.value })}
                        placeholder="e.g. User login with valid credentials"
                        required
                        maxLength={255}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="case-preconditions" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Preconditions
                    </label>
                    <textarea
                      id="case-preconditions"
                      value={form.preconditions}
                      onChange={(event) => setForm({ ...form, preconditions: event.target.value })}
                      placeholder="e.g. User account exists in database and email is verified"
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                    />
                  </div>

                  <div>
                    <label htmlFor="case-description" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Steps & Expected Result
                    </label>
                    <textarea
                      id="case-description"
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      placeholder="Step 1: Enter email...&#10;Step 2: Click submit...&#10;Expected Result: Dashboard is displayed"
                      rows={4}
                      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label htmlFor="case-type" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Type</label>
                      <select
                        id="case-type"
                        value={form.testType}
                        onChange={(event) => setForm({ ...form, testType: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      >
                        <option value="functional">Functional</option>
                        <option value="regression">Regression</option>
                        <option value="integration">Integration</option>
                        <option value="system">System</option>
                        <option value="api">API</option>
                        <option value="ui">UI</option>
                        <option value="performance">Performance</option>
                        <option value="security">Security</option>
                        <option value="exploratory">Exploratory</option>
                        <option value="uat">UAT</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="case-priority" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Priority</label>
                      <select
                        id="case-priority"
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
                      <label htmlFor="case-category" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Section / Category</label>
                      <input
                        id="case-category"
                        value={form.category}
                        onChange={(event) => setForm({ ...form, category: event.target.value })}
                        maxLength={100}
                        placeholder="General"
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      />
                    </div>

                    <div>
                      <label htmlFor="case-automation" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Automation</label>
                      <select
                        id="case-automation"
                        value={form.automationStatus}
                        onChange={(event) => setForm({ ...form, automationStatus: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-xs text-slate-800 focus:outline-none focus:border-[#48a43f]"
                      >
                        <option value="manual">Manual</option>
                        <option value="automated">Automated</option>
                        <option value="to_automate">To automate</option>
                        <option value="not_automatable">Not automatable</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#edf2f7] flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving || !project}
                      className="btn-testrail-primary"
                    >
                      {saving ? 'Saving...' : 'Add Test Case'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/test-cases')}
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
