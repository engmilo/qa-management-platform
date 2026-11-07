'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Building2, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
    <div className="flex h-screen bg-[#f5f7f9]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-[#6e7d8c] mb-1">
              <Link href="/settings" className="hover:underline">Administration</Link>
              <span>/</span>
              <span className="text-[#1d2d3e] font-medium">New Organization</span>
            </div>

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#1d2d3e] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#48a43f]" />
                  Create Organization
                </h1>
                <p className="text-xs text-[#6e7d8c] mt-0.5">
                  Organizations isolate your projects, repositories, and test runs
                </p>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#d8dee4] hover:bg-[#f5f7f9] text-[#4f6174] text-xs font-semibold rounded shadow-sm transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Cancel
              </Link>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white border border-[#d8dee4] rounded-lg shadow-sm p-6 space-y-5">
              <div>
                <label htmlFor="organization-name" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
                  Organization Name
                </label>
                <input
                  id="organization-name"
                  type="text"
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition placeholder-[#95a5a6]"
                  placeholder="e.g. Acme QA Labs"
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <label htmlFor="organization-slug" className="block text-xs font-semibold text-[#4f6174] uppercase tracking-wide mb-1.5">
                  Organization Slug (Identifier)
                </label>
                <input
                  id="organization-slug"
                  type="text"
                  value={slug}
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, ''));
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm font-mono text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition placeholder-[#95a5a6]"
                  placeholder="acme-qa-labs"
                  maxLength={100}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  required
                />
                <p className="text-[11px] text-[#6e7d8c] mt-1">
                  Used in routing and unique identifiers. Lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              <div className="pt-3 border-t border-[#e5e9ec] flex items-center justify-end gap-3">
                <Link
                  href="/settings"
                  className="px-4 py-2 bg-white border border-[#d8dee4] hover:bg-[#f5f7f9] text-[#4f6174] text-xs font-semibold rounded shadow-sm transition"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#48a43f] hover:bg-[#3d8c36] text-white text-xs font-semibold rounded shadow-sm transition disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {loading ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
