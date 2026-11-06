'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type TestRun = { id: string; name: string; project_id: string; test_plan_id: string | null; status: string; started_at: string };
type Project = { id: string; name: string };

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/test-runs', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([runsResponse, projectsResponse]) => {
        const [runsData, projectsData] = await Promise.all([runsResponse.json(), projectsResponse.json()]);
        if (!runsResponse.ok) throw new Error(runsData.error || 'Could not load test runs.');
        if (!projectsResponse.ok) throw new Error(projectsData.error || 'Could not load projects.');
        setRuns(runsData.testRuns ?? []);
        setProjectNames(Object.fromEntries((projectsData.projects as Project[]).map((project) => [project.id, project.name])));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load test runs.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold text-foreground">Test Execution</h1><Link href="/test-runs/new" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm">New Test Run</Link></div>
      {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
      {loading ? <p className="text-muted-foreground">Loading test runs...</p> : runs.length === 0 ? <p className="text-muted-foreground">No test runs yet. Create one to get started.</p> : (
        <div className="bg-secondary border border-border rounded-lg overflow-x-auto"><table className="w-full min-w-[640px]"><thead className="bg-muted/50"><tr>{['Name', 'Project', 'Status', 'Started'].map((heading) => <th key={heading} className="text-left p-4 text-sm font-medium text-muted-foreground">{heading}</th>)}</tr></thead>
          <tbody>{runs.map((run) => <tr key={run.id} className="border-t border-border"><td className="p-4 text-sm text-foreground">{run.name}</td><td className="p-4 text-sm text-muted-foreground">{projectNames[run.project_id] || 'Project'}</td><td className="p-4 text-sm text-foreground capitalize">{run.status.replace('_', ' ')}</td><td className="p-4 text-sm text-muted-foreground">{new Date(run.started_at).toLocaleString()}</td></tr>)}</tbody>
        </table></div>
      )}
    </main></div></div>
  );
}
