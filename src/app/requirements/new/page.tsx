'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ProjectSelector, type ProjectOption } from '@/components/forms/project-selector';

export default function NewRequirementPage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOption | null>(null);
  const [form, setForm] = useState({ reqKey: '', title: '', description: '', type: 'functional', priority: 'medium', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, projectId: project.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the requirement.');
      router.push('/requirements');
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create the requirement.');
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
              <Link href="/requirements" className="text-sm text-muted-foreground hover:text-foreground">← Requirements</Link>
              <h1 className="text-2xl font-bold text-foreground mt-2">New Requirement</h1>
            </div>
            <form onSubmit={submit} className="space-y-5 bg-secondary border border-border rounded-lg p-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Project</label>
                <ProjectSelector value={project?.id ?? ''} onChange={setProject} />
              </div>
              <div>
                <label htmlFor="req-key" className="block text-sm font-medium text-foreground mb-2">Requirement Key</label>
                <input id="req-key" value={form.reqKey} onChange={(event) => setForm({ ...form, reqKey: event.target.value.toUpperCase() })} placeholder="REQ-101" required maxLength={30} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" />
              </div>
              <div>
                <label htmlFor="req-title" className="block text-sm font-medium text-foreground mb-2">Title</label>
                <input id="req-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="User authentication" required maxLength={255} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" />
              </div>
              <div>
                <label htmlFor="req-description" className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea id="req-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="req-type" className="block text-sm font-medium text-foreground mb-2">Type</label>
                  <select id="req-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground">
                    <option value="functional">Functional</option><option value="non_functional">Non-functional</option><option value="business">Business</option><option value="performance">Performance</option><option value="security">Security</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="req-priority" className="block text-sm font-medium text-foreground mb-2">Priority</label>
                  <select id="req-priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="req-status" className="block text-sm font-medium text-foreground mb-2">Status</label>
                  <select id="req-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground">
                    <option value="draft">Draft</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="implemented">Implemented</option><option value="verified">Verified</option><option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving || !project} className="px-5 py-2 bg-primary text-white rounded-md disabled:opacity-50">{saving ? 'Saving...' : 'Create Requirement'}</button>
                <button type="button" onClick={() => router.push('/requirements')} disabled={saving} className="px-5 py-2 border border-border rounded-md text-foreground hover:bg-muted disabled:opacity-50">Cancel</button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
