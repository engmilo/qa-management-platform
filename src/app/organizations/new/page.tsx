'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Could not create the organization.');
        return;
      }

      router.push('/projects/new');
      router.refresh();
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
            <h1 className="text-2xl font-bold text-foreground mb-2">Create New Organization</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Organizations keep your projects and QA data together. You will be added as the organization admin.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6 bg-secondary border border-border rounded-lg p-6">
              <div>
                <label htmlFor="organization-name" className="block text-sm font-medium text-foreground mb-2">
                  Organization Name
                </label>
                <input
                  id="organization-name"
                  type="text"
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Acme QA Labs"
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <label htmlFor="organization-slug" className="block text-sm font-medium text-foreground mb-2">
                  Organization Slug
                </label>
                <input
                  id="organization-slug"
                  type="text"
                  value={slug}
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, ''));
                  }}
                  className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="acme-qa-labs"
                  maxLength={100}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Used in URLs. Use lowercase letters, numbers, and hyphens.
                </p>
              </div>

              {error && <div role="alert" className="text-red-500 text-sm">{error}</div>}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Organization'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 bg-secondary border border-border rounded-md text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
