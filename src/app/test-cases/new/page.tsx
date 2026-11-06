'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';

export default function NewTestCasePage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [form, setForm] = useState({ caseKey: '', title: '', description: '', preconditions: '', testType: 'functional', priority: 'medium', category: 'General', automationStatus: 'manual' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/test-cases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId: project.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the test case.');
      router.push('/test-cases');
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create the test case.');
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
            <div className="mb-6">
              <Link href="/test-cases" className="text-sm text-muted-foreground hover:text-foreground">← Test Cases</Link>
              <h1 className="text-2xl font-bold text-foreground mt-2">New Test Case</h1>
            </div>
            <form onSubmit={submit} className="space-y-5 bg-secondary border border-border rounded-lg p-6">
              <div><label className="block text-sm font-medium text-foreground mb-2">Project</label><ProjectSelector value={project?.id ?? ''} onChange={setProject} /></div>
              <div><label htmlFor="case-key" className="block text-sm font-medium text-foreground mb-2">Test Case Key</label><input id="case-key" value={form.caseKey} onChange={(event) => setForm({ ...form, caseKey: event.target.value.toUpperCase() })} placeholder="TC-101" required maxLength={30} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <div><label htmlFor="case-title" className="block text-sm font-medium text-foreground mb-2">Title</label><input id="case-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="User login with valid credentials" required maxLength={255} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <div><label htmlFor="case-description" className="block text-sm font-medium text-foreground mb-2">Description</label><textarea id="case-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <div><label htmlFor="case-preconditions" className="block text-sm font-medium text-foreground mb-2">Preconditions</label><textarea id="case-preconditions" value={form.preconditions} onChange={(event) => setForm({ ...form, preconditions: event.target.value })} rows={2} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label htmlFor="case-type" className="block text-sm font-medium text-foreground mb-2">Type</label><select id="case-type" value={form.testType} onChange={(event) => setForm({ ...form, testType: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"><option value="functional">Functional</option><option value="regression">Regression</option><option value="integration">Integration</option><option value="system">System</option><option value="api">API</option><option value="ui">UI</option><option value="performance">Performance</option><option value="security">Security</option><option value="exploratory">Exploratory</option><option value="uat">UAT</option></select></div>
                <div><label htmlFor="case-priority" className="block text-sm font-medium text-foreground mb-2">Priority</label><select id="case-priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                <div><label htmlFor="case-category" className="block text-sm font-medium text-foreground mb-2">Category</label><input id="case-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} maxLength={100} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" /></div>
                <div><label htmlFor="case-automation" className="block text-sm font-medium text-foreground mb-2">Automation</label><select id="case-automation" value={form.automationStatus} onChange={(event) => setForm({ ...form, automationStatus: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"><option value="manual">Manual</option><option value="automated">Automated</option><option value="to_automate">To automate</option><option value="not_automatable">Not automatable</option></select></div>
              </div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3"><button type="submit" disabled={saving || !project} className="px-5 py-2 bg-primary text-white rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Create Test Case'}</button><button type="button" onClick={() => router.push('/test-cases')} disabled={saving} className="px-5 py-2 border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50">Cancel</button></div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
