'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function NewProjectPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      router.push('/projects');
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-6">Create New Project</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6 bg-secondary border border-border rounded-lg p-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project Key
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({...formData, key: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="MBA"
                  maxLength={10}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">Unique identifier, uppercase, max 10 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Mobile Banking App"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Brief description of the project"
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Project'}
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
