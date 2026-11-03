'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function TraceabilityPage() {
  const traceabilityData = [
    {
      requirement: 'REQ-101: User Authentication',
      testCases: ['TC-101', 'TC-102', 'TC-103'],
      coverage: 100,
      defects: 0,
    },
    {
      requirement: 'REQ-102: Two-Factor Authentication',
      testCases: ['TC-201', 'TC-202'],
      coverage: 67,
      defects: 1,
    },
    {
      requirement: 'REQ-201: Product Search',
      testCases: ['TC-301', 'TC-302', 'TC-303', 'TC-304'],
      coverage: 100,
      defects: 2,
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Traceability Matrix</h1>
            <p className="text-muted-foreground mt-1">Track requirements coverage across test cases and defects</p>
          </div>

          <div className="bg-secondary border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Requirement</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Test Cases</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Coverage</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Defects</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {traceabilityData.map((item, idx) => (
                    <tr key={idx} className="border-t border-border hover:bg-muted/30">
                      <td className="p-4 text-sm text-foreground">{item.requirement}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {item.testCases.map((tc) => (
                            <span key={tc} className="text-xs px-2 py-1 bg-muted rounded font-mono">
                              {tc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${item.coverage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-foreground">{item.coverage}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {item.defects > 0 ? (
                          <span className="text-sm text-red-400">{item.defects} open</span>
                        ) : (
                          <span className="text-sm text-green-400">None</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.coverage === 100 && item.defects === 0
                            ? 'bg-green-500/20 text-green-400'
                            : item.coverage < 100
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {item.coverage === 100 && item.defects === 0 ? 'Complete' :
                           item.coverage < 100 ? 'In Progress' : 'Needs Review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 bg-secondary border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Coverage Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Requirements</p>
                <p className="text-2xl font-bold text-foreground">245</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Covered Requirements</p>
                <p className="text-2xl font-bold text-green-400">198</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coverage Percentage</p>
                <p className="text-2xl font-bold text-foreground">81%</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
