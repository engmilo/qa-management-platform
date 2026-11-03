'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import Link from 'next/link';

export default function ReportsPage() {
  const reports = [
    {
      id: '1',
      name: 'Test Execution Summary',
      description: 'Overview of test execution metrics and pass/fail trends',
      generatedAt: '2024-11-01',
    },
    {
      id: '2',
      name: 'Defect Severity Distribution',
      description: 'Analysis of defects by severity and priority',
      generatedAt: '2024-11-01',
    },
    {
      id: '3',
      name: 'Requirements Coverage Report',
      description: 'Traceability matrix showing requirements coverage',
      generatedAt: '2024-10-30',
    },
    {
      id: '4',
      name: 'Release Readiness Report',
      description: 'Comprehensive readiness assessment for upcoming release',
      generatedAt: '2024-10-28',
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <Link
              href="/reports/generate"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm"
            >
              Generate Report
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report) => (
              <div key={report.id} className="bg-secondary border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">{report.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Generated: {report.generatedAt}</span>
                  <div className="flex gap-2">
                    <Link
                      href={`/reports/${report.id}/download?format=pdf`}
                      className="text-xs text-primary hover:underline"
                    >
                      PDF
                    </Link>
                    <span className="text-muted-foreground">|</span>
                    <Link
                      href={`/reports/${report.id}/download?format=xlsx`}
                      className="text-xs text-primary hover:underline"
                    >
                      Excel
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
