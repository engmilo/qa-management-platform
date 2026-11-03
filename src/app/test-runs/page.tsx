'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import Link from 'next/link';

export default function TestRunsPage() {
  const [testRuns] = useState([
    {
      id: '1',
      name: 'Sprint 23 Testing',
      project: 'Mobile Banking App',
      testPlan: 'v2.0 Release Testing',
      status: 'in_progress',
      passed: 145,
      failed: 20,
      blocked: 10,
    },
    {
      id: '2',
      name: 'Regression Suite Q4',
      project: 'E-Commerce Platform',
      testPlan: 'Q4 Regression',
      status: 'completed',
      passed: 504,
      failed: 43,
      blocked: 20,
    },
  ]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Test Execution</h1>
            <Link
              href="/test-runs/new"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm"
            >
              New Test Run
            </Link>
          </div>

          <div className="bg-secondary border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Project</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Test Plan</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Passed</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Failed</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {testRuns.map((run) => (
                  <tr key={run.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4 text-sm text-foreground">{run.name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{run.project}</td>
                    <td className="p-4 text-sm text-muted-foreground">{run.testPlan}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        run.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {run.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-green-400">{run.passed}</td>
                    <td className="p-4 text-sm text-red-400">{run.failed}</td>
                    <td className="p-4 text-sm text-orange-400">{run.blocked}</td>
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
