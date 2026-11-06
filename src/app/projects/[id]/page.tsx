'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type Project = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetch(`/api/projects/${encodeURIComponent(projectId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load this project.');
        return result.project as Project;
      })
      .then((result) => { if (active) setProject(result); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load this project.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [projectId]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Project overview</p>
                <h1 className="text-2xl font-bold text-foreground">{loading ? 'Loading project...' : project?.name || 'Project unavailable'}</h1>
              </div>
              <Link href="/projects" className="px-4 py-2 bg-background border border-border text-foreground rounded-md text-sm hover:bg-muted">
                Back to Projects
              </Link>
            </div>

            {error ? (
              <section role="alert" className="bg-secondary border border-border rounded-lg p-6">
                <p className="text-foreground">{error}</p>
                <p className="mt-2 text-sm text-muted-foreground">The project may have been removed or may belong to an organization you cannot access.</p>
              </section>
            ) : project ? (
              <section className="bg-secondary border border-border rounded-lg p-6">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <span className="font-mono text-sm text-muted-foreground">{project.key}</span>
                  <span className={`text-xs px-2 py-1 rounded ${project.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {project.status}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-foreground">{project.name}</h2>
                <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.description || 'No project description provided.'}
                </p>
                <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                  <Link href="/projects/new" className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90">
                    Create another project
                  </Link>
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
