'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';
import { ArrowLeft, PlayCircle } from 'lucide-react';

export default function NewTestRunPage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/test-runs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, projectId: project.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the test run.');
      router.push('/test-runs');
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create the test run.');
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
              <Link href="/test-runs" className="text-[#276fbf] hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Test Runs
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Add Test Run</span>
            </div>

            <div className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden mb-6">
              <div className="bg-[#f8fafc] px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#48a43f]/10 text-[#48a43f] flex items-center justify-center">
                  <PlayCircle className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900">Start New Test Run</h1>
                  <p className="text-xs text-slate-500">Initialize test execution session across project test cases</p>
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
                    <label htmlFor="run-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Test Run Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="run-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Sprint 24 Release Regression"
                      required
                      maxLength={255}
                      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      This run will include all test cases currently in the selected project, initialized as <span className="font-semibold text-slate-600">Untested</span>.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#edf2f7] flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving || !project}
                      className="btn-testrail-primary"
                    >
                      {saving ? 'Creating...' : 'Start Test Run'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/test-runs')}
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
