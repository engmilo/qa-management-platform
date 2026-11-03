'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function SettingsPage() {
  const [orgName, setOrgName] = useState('Acme QA Labs');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-foreground mb-6">Organization Settings</h1>

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
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm"
              >
                Save Changes
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
