import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function DashboardPage() {
  const stats = [
    { label: 'Total Projects', value: '12', change: '+2' },
    { label: 'Total Requirements', value: '245', change: '+18' },
    { label: 'Test Cases', value: '892', change: '+42' },
    { label: 'Pass Rate', value: '87%', change: '+5%' },
    { label: 'Open Defects', value: '23', change: '-7' },
    { label: 'Critical Defects', value: '3', change: '-2' },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back, John</h2>
            <p className="text-muted-foreground">Here's what's happening with your QA projects today.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-secondary border border-border rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
                  </div>
                  <span className="text-sm text-green-500">{stat.change}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-secondary border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Test Execution Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Mobile Banking App</span>
                    <span className="text-foreground">75%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[75%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">E-Commerce Platform</span>
                    <span className="text-foreground">92%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[92%]"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-secondary border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Defects</h3>
              <div className="space-y-3">
                {[
                  { id: 'DEF-101', summary: 'Login button not responsive', severity: 'High' },
                  { id: 'DEF-102', summary: 'Payment gateway timeout', severity: 'Critical' },
                  { id: 'DEF-103', summary: 'Search filter incorrect results', severity: 'Medium' },
                ].map((defect) => (
                  <div key={defect.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div>
                      <p className="text-sm font-medium text-foreground">{defect.id}</p>
                      <p className="text-xs text-muted-foreground">{defect.summary}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      defect.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                      defect.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {defect.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
