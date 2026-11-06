'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

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

  return (
    <div className="flex h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold text-foreground">Test Plans</h1><Link href="/test-plans/new" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm">New Test Plan</Link></div>
      {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
      {loading ? <p className="text-muted-foreground">Loading test plans...</p> : plans.length === 0 ? <p className="text-muted-foreground">No test plans yet. Create one to get started.</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{plans.map((plan) => <section key={plan.id} className="bg-secondary border border-border rounded-lg p-6">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-foreground">{plan.title}</h2><p className="text-sm text-muted-foreground mt-1">{projectNames[plan.project_id] || 'Project'}</p></div><span className="text-xs px-2 py-1 rounded capitalize bg-muted text-foreground">{plan.status.replace('_', ' ')}</span></div>
          {plan.scope && <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{plan.scope}</p>}
          <p className="mt-4 text-xs text-muted-foreground">{plan.start_date || 'No start date'}{plan.end_date ? ` — ${plan.end_date}` : ''}</p>
        </section>)}</div>
      )}
    </main></div></div>
  );
}
