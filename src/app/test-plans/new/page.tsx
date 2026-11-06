'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';

export default function NewTestPlanPage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [form, setForm] = useState({ title: '', scope: '', startDate: '', endDate: '', status: 'planning' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/test-plans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId: project.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the test plan.');
      router.push('/test-plans');
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create the test plan.');
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
            <div className="mb-6"><Link href="/test-plans" className="text-sm text-muted-foreground hover:text-foreground">← Test Plans</Link><h1 className="text-2xl font-bold text-foreground mt-2">New Test Plan</h1></div>
            <form onSubmit={submit} className="space-y-5 bg-secondary border border-border rounded-lg p-6">
              <div><label className="block text-sm font-medium text-foreground mb-2">Project</label><ProjectSelector value={project?.id ?? ''} onChange={setProject} /></div>
              <div><label htmlFor="plan-title" className="block text-sm font-medium text-foreground mb-2">Plan Name</label><input id="plan-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Release regression testing" required maxLength={255} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <div><label htmlFor="plan-scope" className="block text-sm font-medium text-foreground mb-2">Scope</label><textarea id="plan-scope" value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} rows={4} placeholder="Features and test areas included in this plan" className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label htmlFor="plan-start" className="block text-sm font-medium text-foreground mb-2">Start Date</label><input id="plan-start" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground" /></div>
                <div><label htmlFor="plan-end" className="block text-sm font-medium text-foreground mb-2">End Date</label><input id="plan-end" type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground" /></div>
                <div><label htmlFor="plan-status" className="block text-sm font-medium text-foreground mb-2">Status</label><select id="plan-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"><option value="planning">Planning</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></div>
              </div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3"><button type="submit" disabled={saving || !project} className="px-5 py-2 bg-primary text-white rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Create Test Plan'}</button><button type="button" onClick={() => router.push('/test-plans')} disabled={saving} className="px-5 py-2 border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50">Cancel</button></div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
