'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import Link from 'next/link';

export default function RequirementsPage() {
  const [requirements] = useState([
    {
      id: '1',
      key: 'REQ-101',
      title: 'User Authentication',
      project: 'Mobile Banking App',
      priority: 'critical',
      status: 'approved',
      type: 'functional',
    },
    {
      id: '2',
      key: 'REQ-102',
      title: 'Two-Factor Authentication',
      project: 'Mobile Banking App',
      priority: 'high',
      status: 'under_review',
      type: 'security',
    },
    {
      id: '3',
      key: 'REQ-201',
      title: 'Product Search',
      project: 'E-Commerce Platform',
      priority: 'medium',
      status: 'implemented',
      type: 'functional',
    },
  ]);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-400',
    under_review: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    implemented: 'bg-blue-500/20 text-blue-400',
    verified: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-orange-500/20 text-orange-400',
    critical: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Requirements</h1>
            <Link
              href="/requirements/new"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm"
            >
              New Requirement
            </Link>
          </div>

          <div className="bg-secondary border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Title</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Project</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Priority</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => (
                  <tr key={req.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4">
                      <span className="text-sm font-mono text-foreground">{req.key}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">{req.title}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">{req.project}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground capitalize">{req.type}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded capitalize ${priorityColors[req.priority]}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[req.status]}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
