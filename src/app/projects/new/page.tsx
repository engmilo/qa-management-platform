'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { FolderPlus, ArrowLeft } from 'lucide-react';

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
    <div className="flex h-screen bg-[#f5f7f9]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <Link href="/projects" className="text-[#276fbf] hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Add Project</span>
            </div>

            <div className="bg-white border border-[#d8dee4] rounded-md shadow-sm overflow-hidden mb-6">
              <div className="bg-[#f8fafc] px-6 py-4 border-b border-[#e2e8f0] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-[#276fbf]/10 text-[#276fbf] flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-slate-900">Add New Project</h1>
                  <p className="text-xs text-slate-500">Create a repository for your test suites, runs, and cases</p>
                </div>
              </div>

              <div className="p-6">
                {error && (
                  <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium">
                    {error}
                  </div>
                )}
                {organizationLoadError && (
                  <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-medium">
                    {organizationLoadError}
                  </div>
                )}

                {loadingOrganizations ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Loading organizations…</p>
                ) : organizationLoadError ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-600">We could not confirm your organization access, so project creation is paused.</p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-3 btn-testrail-secondary"
                    >
                      Try again
                    </button>
                  </div>
                ) : orgs.length === 0 ? (
                  <div className="text-center py-4">
                    <h2 className="text-sm font-bold text-slate-900">Create an organization first</h2>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      Projects belong to an organization. Create one to get started; you will be its admin.
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                      <Link
                        href="/organizations/new"
                        className="btn-testrail-primary"
                      >
                        Create Organization
                      </Link>
                      <button
                        type="button"
                        onClick={() => router.push('/projects')}
                        className="btn-testrail-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="project-organization" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Organization <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="project-organization"
                        value={formData.organizationId}
                        onChange={(event) => setFormData({ ...formData, organizationId: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
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
                      <label htmlFor="project-key" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Project Identifier Key <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="project-key"
                        type="text"
                        value={formData.key}
                        onChange={(event) => setFormData({ ...formData, key: event.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm font-mono text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                        placeholder="e.g. MBA, CRM, WEB"
                        maxLength={10}
                        required
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Short uppercase prefix for test case numbers (e.g. MBA-C1, MBA-C2)</p>
                    </div>

                    <div>
                      <label htmlFor="project-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Project Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="project-name"
                        type="text"
                        value={formData.name}
                        onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                        placeholder="e.g. Mobile Banking App v2"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="project-description" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                        Announcement / Description
                      </label>
                      <textarea
                        id="project-description"
                        value={formData.description}
                        onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-slate-800 focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f]"
                        placeholder="Brief overview of project scope, test environment, and goals"
                        rows={3}
                      />
                    </div>

                    <div className="pt-4 border-t border-[#edf2f7] flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={loading || loadingOrganizations || orgs.length === 0}
                        className="btn-testrail-primary"
                      >
                        {loading ? 'Creating...' : 'Add Project'}
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push('/projects')}
                        disabled={loading}
                        className="btn-testrail-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
