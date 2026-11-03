'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import Link from 'next/link';

export default function DefectsPage() {
  const defects = [
    {
      id: 'DEF-101',
      summary: 'Login button not responding on mobile',
      project: 'Mobile Banking App',
      severity: 'critical',
      priority: 'critical',
      status: 'open',
      assignedTo: 'John Smith',
    },
    {
      id: 'DEF-102',
      summary: 'Payment gateway timeout during peak hours',
      project: 'Mobile Banking App',
      severity: 'major',
      priority: 'high',
      status: 'in_progress',
      assignedTo: 'Sarah Johnson',
    },
    {
      id: 'DEF-103',
      summary: 'Search filter returns incorrect results',
      project: 'E-Commerce Platform',
      severity: 'minor',
      priority: 'medium',
      status: 'new',
      assignedTo: 'Unassigned',
    },
  ];

  const severityColors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400',
    major: 'bg-orange-500/20 text-orange-400',
    minor: 'bg-yellow-500/20 text-yellow-400',
    trivial: 'bg-gray-500/20 text-gray-400',
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500/20 text-blue-400',
    open: 'bg-orange-500/20 text-orange-400',
    in_progress: 'bg-purple-500/20 text-purple-400',
    fixed: 'bg-green-500/20 text-green-400',
    closed: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Defects</h1>
            <Link
              href="/defects/new"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm"
            >
              New Defect
            </Link>
          </div>

          <div className="bg-secondary border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Summary</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Project</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Severity</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Priority</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {defects.map((defect) => (
                  <tr key={defect.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4">
                      <span className="text-sm font-mono text-foreground">{defect.id}</span>
                    </td>
                    <td className="p-4 text-sm text-foreground">{defect.summary}</td>
                    <td className="p-4 text-sm text-muted-foreground">{defect.project}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded capitalize ${severityColors[defect.severity]}`}>
                        {defect.severity}
                      </span>
                    </td>
                    <td className="p-4 text-sm capitalize text-foreground">{defect.priority}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${statusColors[defect.status]}`}>
                        {defect.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{defect.assignedTo}</td>
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
