'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, Calendar } from 'lucide-react';

type TestPlan = { id: string; title: string; project_id: string; scope: string | null; status: string; start_date: string | null; end_date: string | null };
type Project = { id: string; name: string };

export default function TestPlansPage() {
  const [plans, setPlans] = useState<TestPlan[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/test-plans', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([plansResponse, projectsResponse]) => {
        const [plansData, projectsData] = await Promise.all([plansResponse.json(), projectsResponse.json()]);
        if (!plansResponse.ok) throw new Error(plansData.error || 'Could not load test plans.');
        if (!projectsResponse.ok) throw new Error(projectsData.error || 'Could not load projects.');
        setPlans(plansData.testPlans ?? []);
        setProjectNames(Object.fromEntries((projectsData.projects as Project[]).map((project) => [project.id, project.name])));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load test plans.'))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-[#dff0d8] dark:bg-[#132c1c] text-[#3c763d] dark:text-[#52c41a] border border-[#d6e9c6] dark:border-[#1d4c2b]';
      case 'in_progress':
        return 'bg-[#e0f2fe] dark:bg-[#112d44] text-[#0369a1] dark:text-[#38bdf8] border border-[#bae6fd] dark:border-[#1e4d6d]';
      case 'planning':
      default:
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900';
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Test Plans</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Organize releases, milestones, test suites, and schedule testing cycles
              </p>
            </div>
            <Link
              href="/test-plans/new"
              className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors inline-flex items-center gap-1.5 focus:outline-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Test Plan</span>
            </Link>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs font-medium">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-8 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
              Loading test plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-10 text-center shadow-sm">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No test plans yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Group multiple test suites and test runs together for a release or sprint milestone.
              </p>
              <Link
                href="/test-plans/new"
                className="mt-4 inline-flex items-center gap-1.5 bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Create your first test plan
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {plans.map((plan) => (
                <section
                  key={plan.id}
                  className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5 shadow-sm hover:shadow hover:border-[#b0c4de] dark:hover:border-[#3a4e6b] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                          {plan.title}
                        </h2>
                        <p className="text-xs font-medium text-[#276fbf] dark:text-[#4da3ff] mt-0.5">
                          {projectNames[plan.project_id] || 'General Project'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${getStatusBadge(plan.status)}`}>
                        {plan.status.replace('_', ' ')}
                      </span>
                    </div>

                    {plan.scope && (
                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed bg-[#f8fafc] dark:bg-[#141d28] p-2.5 rounded border border-[#edf2f7] dark:border-[#222e3e]">
                        {plan.scope}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#edf2f7] dark:border-[#222e3e] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      {plan.start_date || 'No start date'}
                      {plan.end_date ? ` — ${plan.end_date}` : ''}
                    </span>
                    <span className="font-mono text-[10px]">ID: {plan.id.slice(0, 8)}</span>
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
