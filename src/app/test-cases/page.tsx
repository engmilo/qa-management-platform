'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import Link from 'next/link';

export default function TestCasesPage() {
  const [testCases] = useState([
    {
      id: '1',
      key: 'TC-101',
      title: 'User login with valid credentials',
      project: 'Mobile Banking App',
      type: 'functional',
      priority: 'critical',
      automation: 'automated',
    },
    {
      id: '2',
      key: 'TC-102',
      title: 'User login with invalid credentials',
      project: 'Mobile Banking App',
      type: 'functional',
      priority: 'high',
      automation: 'automated',
    },
    {
      id: '3',
      key: 'TC-201',
      title: 'Product search with filters',
      project: 'E-Commerce Platform',
      type: 'functional',
      priority: 'medium',
      automation: 'manual',
    },
  ]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Test Cases</h1>
            <Link
              href="/test-cases/new"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm"
            >
              New Test Case
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
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Automation</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map((tc) => (
                  <tr key={tc.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4">
                      <span className="text-sm font-mono text-foreground">{tc.key}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">{tc.title}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">{tc.project}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground capitalize">{tc.type}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded capitalize ${
                        tc.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                        tc.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {tc.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded capitalize ${
                        tc.automation === 'automated' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {tc.automation}
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
