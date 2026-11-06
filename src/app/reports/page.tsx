import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

const reports = [
  { title: 'Project Inventory', description: 'Export projects across the organizations you can access.', type: 'projects' },
  { title: 'Requirements Report', description: 'Export requirements with status, priority, and project details.', type: 'requirements' },
  { title: 'Test Case Catalog', description: 'Export your test cases, types, priorities, and automation status.', type: 'testCases' },
  { title: 'Test Plan Report', description: 'Export test plans, scope, dates, and statuses.', type: 'testPlans' },
  { title: 'Test Run Summary', description: 'Export test runs and their execution statuses.', type: 'testRuns' },
  { title: 'Defect Report', description: 'Export defects with severity, priority, and status.', type: 'defects' },
];

export default function ReportsPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div><h1 className="text-2xl font-bold text-foreground">Reports</h1><p className="mt-1 text-sm text-muted-foreground">Generate downloadable CSV reports from your accessible QA data.</p></div>
            <Link href="/reports/generate" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm">Generate Report</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report) => (
              <section key={report.type} className="bg-secondary border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">{report.title}</h2>
                <p className="text-sm text-muted-foreground mb-5">{report.description}</p>
                <Link href={`/reports/generate?type=${report.type}`} className="text-sm text-primary hover:underline">Generate CSV →</Link>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
