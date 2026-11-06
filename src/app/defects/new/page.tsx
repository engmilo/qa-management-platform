'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';

export default function NewDefectPage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [form, setForm] = useState({ defectKey: '', summary: '', description: '', severity: 'major', priority: 'medium', environment: '', stepsToReproduce: '', expectedResult: '', actualResult: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/defects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId: project.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not report the defect.');
      router.push('/defects');
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not report the defect.');
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
            <div className="mb-6"><Link href="/defects" className="text-sm text-muted-foreground hover:text-foreground">← Defects</Link><h1 className="text-2xl font-bold text-foreground mt-2">New Defect</h1></div>
            <form onSubmit={submit} className="space-y-5 bg-secondary border border-border rounded-lg p-6">
              <div><label className="block text-sm font-medium text-foreground mb-2">Project</label><ProjectSelector value={project?.id ?? ''} onChange={setProject} /></div>
              <div><label htmlFor="defect-key" className="block text-sm font-medium text-foreground mb-2">Defect Key</label><input id="defect-key" value={form.defectKey} onChange={(event) => setForm({ ...form, defectKey: event.target.value.toUpperCase() })} placeholder="BUG-101" required maxLength={30} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <div><label htmlFor="defect-summary" className="block text-sm font-medium text-foreground mb-2">Summary</label><input id="defect-summary" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Login button does not respond" required maxLength={255} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <div><label htmlFor="defect-description" className="block text-sm font-medium text-foreground mb-2">Description</label><textarea id="defect-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label htmlFor="defect-severity" className="block text-sm font-medium text-foreground mb-2">Severity</label><select id="defect-severity" value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"><option value="trivial">Trivial</option><option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option><option value="blocker">Blocker</option></select></div>
                <div><label htmlFor="defect-priority" className="block text-sm font-medium text-foreground mb-2">Priority</label><select id="defect-priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                <div><label htmlFor="defect-environment" className="block text-sm font-medium text-foreground mb-2">Environment</label><input id="defect-environment" value={form.environment} onChange={(event) => setForm({ ...form, environment: event.target.value })} placeholder="QA / Chrome" className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              </div>
              <div><label htmlFor="defect-steps" className="block text-sm font-medium text-foreground mb-2">Steps to Reproduce</label><textarea id="defect-steps" value={form.stepsToReproduce} onChange={(event) => setForm({ ...form, stepsToReproduce: event.target.value })} rows={3} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label htmlFor="defect-expected" className="block text-sm font-medium text-foreground mb-2">Expected Result</label><textarea id="defect-expected" value={form.expectedResult} onChange={(event) => setForm({ ...form, expectedResult: event.target.value })} rows={2} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
                <div><label htmlFor="defect-actual" className="block text-sm font-medium text-foreground mb-2">Actual Result</label><textarea id="defect-actual" value={form.actualResult} onChange={(event) => setForm({ ...form, actualResult: event.target.value })} rows={2} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              </div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3"><button type="submit" disabled={saving || !project} className="px-5 py-2 bg-primary text-white rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Create Defect'}</button><button type="button" onClick={() => router.push('/defects')} disabled={saving} className="px-5 py-2 border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50">Cancel</button></div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
