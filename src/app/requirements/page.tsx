'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type Requirement = { id: string; req_key: string; title: string; project_id: string; type: string; priority: string; status: string };
type Project = { id: string; name: string };

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/requirements', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([requirementsResponse, projectsResponse]) => {
        const [requirementsData, projectsData] = await Promise.all([requirementsResponse.json(), projectsResponse.json()]);
        if (!requirementsResponse.ok) throw new Error(requirementsData.error || 'Could not load requirements.');
        if (!projectsResponse.ok) throw new Error(projectsData.error || 'Could not load projects.');
        setRequirements(requirementsData.requirements ?? []);
        setProjectNames(Object.fromEntries((projectsData.projects as Project[]).map((project) => [project.id, project.name])));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load requirements.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold text-foreground">Requirements</h1><Link href="/requirements/new" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm">New Requirement</Link></div>
          {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
          {loading ? <p className="text-muted-foreground">Loading requirements...</p> : requirements.length === 0 ? <p className="text-muted-foreground">No requirements yet. Create one to get started.</p> : (
            <div className="bg-secondary border border-border rounded-lg overflow-x-auto">
              <table className="w-full min-w-[720px]"><thead className="bg-muted/50"><tr>{['Key', 'Title', 'Project', 'Type', 'Priority', 'Status'].map((heading) => <th key={heading} className="text-left p-4 text-sm font-medium text-muted-foreground">{heading}</th>)}</tr></thead>
                <tbody>{requirements.map((item) => <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4 text-sm font-mono text-foreground">{item.req_key}</td><td className="p-4 text-sm text-foreground">{item.title}</td><td className="p-4 text-sm text-muted-foreground">{projectNames[item.project_id] || 'Project'}</td><td className="p-4 text-sm text-muted-foreground">{item.type.replace('_', ' ')}</td>
                  <td className="p-4"><span className="text-xs px-2 py-1 rounded capitalize bg-muted text-foreground">{item.priority}</span></td><td className="p-4"><span className="text-xs px-2 py-1 rounded capitalize bg-muted text-foreground">{item.status.replace('_', ' ')}</span></td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
