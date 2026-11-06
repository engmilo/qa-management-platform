'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type TestCase = { id: string; case_key: string; title: string; project_id: string; test_type: string; priority: string; automation_status: string };
type Project = { id: string; name: string };

export default function TestCasesPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/test-cases', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([casesResponse, projectsResponse]) => {
        const [casesData, projectsData] = await Promise.all([casesResponse.json(), projectsResponse.json()]);
        if (!casesResponse.ok) throw new Error(casesData.error || 'Could not load test cases.');
        if (!projectsResponse.ok) throw new Error(projectsData.error || 'Could not load projects.');
        setTestCases(casesData.testCases ?? []);
        setProjectNames(Object.fromEntries((projectsData.projects as Project[]).map((project) => [project.id, project.name])));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load test cases.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold text-foreground">Test Cases</h1><Link href="/test-cases/new" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm">New Test Case</Link></div>
      {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
      {loading ? <p className="text-muted-foreground">Loading test cases...</p> : testCases.length === 0 ? <p className="text-muted-foreground">No test cases yet. Create one to get started.</p> : (
        <div className="bg-secondary border border-border rounded-lg overflow-x-auto"><table className="w-full min-w-[720px]"><thead className="bg-muted/50"><tr>{['Key', 'Title', 'Project', 'Type', 'Priority', 'Automation'].map((heading) => <th key={heading} className="text-left p-4 text-sm font-medium text-muted-foreground">{heading}</th>)}</tr></thead>
          <tbody>{testCases.map((item) => <tr key={item.id} className="border-t border-border hover:bg-muted/30"><td className="p-4 text-sm font-mono text-foreground">{item.case_key}</td><td className="p-4 text-sm text-foreground">{item.title}</td><td className="p-4 text-sm text-muted-foreground">{projectNames[item.project_id] || 'Project'}</td><td className="p-4 text-sm text-muted-foreground capitalize">{item.test_type}</td><td className="p-4 text-sm text-foreground capitalize">{item.priority}</td><td className="p-4 text-sm text-muted-foreground">{item.automation_status.replace('_', ' ')}</td></tr>)}</tbody>
        </table></div>
      )}
    </main></div></div>
  );
}
