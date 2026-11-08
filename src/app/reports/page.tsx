import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Plus, BarChart3, FileSpreadsheet, FolderKanban, FileText, CheckSquare, Calendar, PlayCircle, Bug } from 'lucide-react';

const reports = [
  { title: 'Project Inventory', description: 'Export projects across the organizations you can access with key identifiers and statuses.', type: 'projects', icon: FolderKanban },
  { title: 'Requirements Report', description: 'Export requirements with specification statuses, priority levels, and linked project details.', type: 'requirements', icon: FileText },
  { title: 'Test Case Catalog', description: 'Export your test case repository with preconditions, types, priority levels, and automation statuses.', type: 'testCases', icon: CheckSquare },
  { title: 'Test Plan Report', description: 'Export milestone test plans, testing scopes, start/end schedules, and completion states.', type: 'testPlans', icon: Calendar },
  { title: 'Test Run Summary', description: 'Export test execution sessions and their overall pass, fail, and execution statuses.', type: 'testRuns', icon: PlayCircle },
  { title: 'Defect Report', description: 'Export bug tracker records with severity classifications, priority, environment, and statuses.', type: 'defects', icon: Bug },
];

export default function ReportsPage() {
  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Reports &amp; Metrics</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate and export detailed CSV reports across all test lifecycle data
              </p>
            </div>
            <Link
              href="/reports/generate"
              className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold px-3.5 py-2 rounded shadow-sm transition-colors inline-flex items-center gap-1.5 focus:outline-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Generate Report</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <section
                  key={report.type}
                  className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5 shadow-sm hover:shadow hover:border-[#b0c4de] dark:hover:border-[#3a4e6b] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="w-7 h-7 rounded bg-[#eef5fc] dark:bg-[#172739] text-[#276fbf] dark:text-[#4da3ff] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{report.title}</h2>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {report.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#edf2f7] dark:border-[#222e3e] flex items-center justify-between">
                    <Link
                      href={`/reports/generate?type=${report.type}`}
                      className="text-xs font-semibold text-[#276fbf] dark:text-[#4da3ff] hover:text-[#1d5ea8] dark:hover:text-[#7bb7ff] hover:underline inline-flex items-center gap-1"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#48a43f]" />
                      <span>Export CSV →</span>
                    </Link>
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 font-mono">
                      {report.type}
                    </span>
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
