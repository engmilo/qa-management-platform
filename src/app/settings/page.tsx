'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function SettingsPage() {
  const [org, setOrg] = useState<any>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/organizations')
      .then((res) => res.json())
      .then((data) => {
        if (data.organizations && data.organizations.length > 0) {
          const firstOrg = data.organizations[0].organization;
          setOrg(firstOrg);
          setOrgName(firstOrg.name);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;

    setSaving(true);
    const res = await fetch(`/api/organizations/${org.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: orgName }),
      headers: { 'Content-Type': 'application/json' },
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert('Failed to save changes');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-foreground mb-6">Organization Settings</h1>

            {loading ? (
              <div className="text-muted-foreground">Loading settings...</div>
            ) : !org ? (
              <div className="text-muted-foreground">No organization found.</div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6 bg-secondary border border-border rounded-lg p-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Subscription Plan
                  </label>
                  <div className="p-4 bg-background border border-border rounded-md flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Enterprise QA Tier</p>
                      <p className="text-xs text-muted-foreground mt-1">Unlimited projects, requirements, and test runs with AI assistant</p>
                    </div>
                    <span className="text-xs px-3 py-1 bg-primary text-white rounded-full">Active</span>
                  </div>
                </div>

                {saved && (
                  <div className="text-sm text-green-500">Settings saved successfully!</div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
