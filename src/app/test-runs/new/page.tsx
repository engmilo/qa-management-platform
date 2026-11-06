'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';

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
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6"><Link href="/test-runs" className="text-sm text-muted-foreground hover:text-foreground">← Test Execution</Link><h1 className="text-2xl font-bold text-foreground mt-2">New Test Run</h1></div>
            <form onSubmit={submit} className="space-y-5 bg-secondary border border-border rounded-lg p-6">
              <div><label className="block text-sm font-medium text-foreground mb-2">Project</label><ProjectSelector value={project?.id ?? ''} onChange={setProject} /></div>
              <div><label htmlFor="run-name" className="block text-sm font-medium text-foreground mb-2">Run Name</label><input id="run-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Sprint 23 regression run" required maxLength={255} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <p className="text-sm text-muted-foreground">The run will include all test cases currently in the selected project, initialized as Not Run.</p>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3"><button type="submit" disabled={saving || !project} className="px-5 py-2 bg-primary text-white rounded-md disabled:opacity-50">{saving ? 'Creating...' : 'Create Test Run'}</button><button type="button" onClick={() => router.push('/test-runs')} disabled={saving} className="px-5 py-2 border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50">Cancel</button></div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
