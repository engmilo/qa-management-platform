'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type Defect = { id: string; defect_key: string; summary: string; project_id: string; severity: string; priority: string; status: string };
type Project = { id: string; name: string };

export default function DefectsPage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetch('/api/defects', { cache: 'no-store' }), fetch('/api/projects', { cache: 'no-store' })])
      .then(async ([defectsResponse, projectsResponse]) => {
        const [defectsData, projectsData] = await Promise.all([defectsResponse.json(), projectsResponse.json()]);
        if (!defectsResponse.ok) throw new Error(defectsData.error || 'Could not load defects.');
        if (!projectsResponse.ok) throw new Error(projectsData.error || 'Could not load projects.');
        setDefects(defectsData.defects ?? []);
        setProjectNames(Object.fromEntries((projectsData.projects as Project[]).map((project) => [project.id, project.name])));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Could not load defects.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen bg-background"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold text-foreground">Defects</h1><Link href="/defects/new" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm">New Defect</Link></div>
      {error && <p role="alert" className="mb-4 text-sm text-red-500">{error}</p>}
      {loading ? <p className="text-muted-foreground">Loading defects...</p> : defects.length === 0 ? <p className="text-muted-foreground">No defects reported yet.</p> : (
        <div className="bg-secondary border border-border rounded-lg overflow-x-auto"><table className="w-full min-w-[780px]"><thead className="bg-muted/50"><tr>{['Key', 'Summary', 'Project', 'Severity', 'Priority', 'Status'].map((heading) => <th key={heading} className="text-left p-4 text-sm font-medium text-muted-foreground">{heading}</th>)}</tr></thead>
          <tbody>{defects.map((defect) => <tr key={defect.id} className="border-t border-border hover:bg-muted/30"><td className="p-4 text-sm font-mono text-foreground">{defect.defect_key}</td><td className="p-4 text-sm text-foreground">{defect.summary}</td><td className="p-4 text-sm text-muted-foreground">{projectNames[defect.project_id] || 'Project'}</td><td className="p-4 text-sm capitalize text-foreground">{defect.severity}</td><td className="p-4 text-sm capitalize text-foreground">{defect.priority}</td><td className="p-4 text-sm capitalize text-foreground">{defect.status.replace('_', ' ')}</td></tr>)}</tbody>
        </table></div>
      )}
    </main></div></div>
  );
}
