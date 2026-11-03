'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import Link from 'next/link';

export default function TestPlansPage() {
  const testPlans = [
    {
      id: '1',
      title: 'Mobile Banking App v2.0 Release Testing',
      project: 'Mobile Banking App',
      status: 'in_progress',
      progress: 75,
      testCases: 234,
      executed: 175,
    },
    {
      id: '2',
      title: 'E-Commerce Platform Regression Suite',
      project: 'E-Commerce Platform',
      status: 'completed',
      progress: 100,
      testCases: 567,
      executed: 567,
    },
    {
      id: '3',
      title: 'HR System Security Testing',
      project: 'HR Management System',
      status: 'planning',
      progress: 0,
      testCases: 89,
      executed: 0,
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Test Plans</h1>
            <Link
              href="/test-plans/new"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm"
            >
              New Test Plan
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {testPlans.map((plan) => (
              <div key={plan.id} className="bg-secondary border border-border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{plan.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.project}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${
                    plan.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                    plan.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {plan.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground">{plan.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${plan.progress}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Cases</span>
                      <p className="text-lg font-semibold text-foreground">{plan.testCases}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Executed</span>
                      <p className="text-lg font-semibold text-foreground">{plan.executed}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <Link href={`/test-plans/${plan.id}`} className="text-sm text-primary hover:underline">
                    View Plan →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
