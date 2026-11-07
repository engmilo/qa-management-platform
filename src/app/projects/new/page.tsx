'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type OrganizationMembership = {
  organization: { id: string; name: string } | null;
};

export default function NewProjectPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ key: '', name: '', description: '', organizationId: '' });
  const [orgs, setOrgs] = useState<OrganizationMembership[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizationLoadError, setOrganizationLoadError] = useState('');

  useEffect(() => {
    let active = true;

    fetch('/api/organizations', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load organizations.');
        return data;
      })
      .then((data) => {
        if (!active) return;
        if (!Array.isArray(data.organizations)) throw new Error('Organization response was invalid.');
        const memberships = (data.organizations ?? []).filter(
          (item: OrganizationMembership) => item.organization
        ) as OrganizationMembership[];
        setOrgs(memberships);
        if (memberships.length > 0) {
          setFormData((current) => ({ ...current, organizationId: memberships[0].organization!.id }));
        }
      })
      .catch((loadError: unknown) => {
        if (active) setOrganizationLoadError(loadError instanceof Error ? loadError.message : 'Could not load organizations.');
      })
      .finally(() => {
        if (active) setLoadingOrganizations(false);
      });

    return () => { active = false; };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create the project.');
        return;
      }

      router.push('/projects');
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-6">Create New Project</h1>

            {error && <div role="alert" className="mb-4 text-sm text-red-500">{error}</div>}
            {organizationLoadError && <div role="alert" className="mb-4 text-sm text-red-500">{organizationLoadError}</div>}

            {loadingOrganizations ? (
              <p className="rounded-lg border border-border bg-secondary p-6 text-sm text-muted-foreground">Loading organizations…</p>
            ) : organizationLoadError ? (
              <section className="rounded-lg border border-border bg-secondary p-6">
                <p className="text-sm text-muted-foreground">We could not confirm your organization access, so project creation is paused.</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  Try again
                </button>
              </section>
            ) : orgs.length === 0 ? (
              <section className="bg-secondary border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground">Create an organization first</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Projects belong to an organization. Create one to get started; you will be its admin.
                </p>
                <Link
                  href="/organizations/new"
                  className="inline-block mt-5 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
                >
                  Create Organization
                </Link>
                <button
                  type="button"
                  onClick={() => router.push('/projects')}
                  className="inline-block mt-5 ml-3 px-4 py-2 bg-background border border-border text-foreground rounded-md text-sm hover:bg-muted"
                >
                  Cancel
                </button>
              </section>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 bg-secondary border border-border rounded-lg p-6">
                <div>
                  <label htmlFor="project-organization" className="block text-sm font-medium text-foreground mb-2">Organization</label>
                  <select
                    id="project-organization"
                    value={formData.organizationId}
                    onChange={(event) => setFormData({ ...formData, organizationId: event.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    disabled={loadingOrganizations || orgs.length === 0}
                  >
                    {loadingOrganizations ? <option value="">Loading organizations...</option> : null}
                    {orgs.map((membership) => membership.organization && (
                      <option key={membership.organization.id} value={membership.organization.id}>
                        {membership.organization.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="project-key" className="block text-sm font-medium text-foreground mb-2">Project Key</label>
                  <input
                    id="project-key"
                    type="text"
                    value={formData.key}
                    onChange={(event) => setFormData({ ...formData, key: event.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="MBA"
                    maxLength={10}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium text-foreground mb-2">Project Name</label>
                  <input
                    id="project-name"
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Mobile Banking App"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="project-description" className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <textarea
                    id="project-description"
                    value={formData.description}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Brief description of the project"
                    rows={4}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || loadingOrganizations || orgs.length === 0}
                    className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/projects')}
                    disabled={loading}
                    className="px-6 py-2 bg-background border border-border text-foreground rounded-md hover:bg-muted disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
