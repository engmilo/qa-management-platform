"use client";
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

export default function DashboardEnhancedPage() {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetch('/api/dashboard/enhanced').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-10 text-center text-slate-400">Loading Command Center...</div>;

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-[#0f172a]">
          <div className="max-w-7xl mx-auto">
            {/* Command Center Header */}
            <div className="bg-[#182232] p-6 rounded border border-[#28374d] mb-6 shadow-sm">
              <h1 className="text-xl font-bold text-white">QA Quality Command Center</h1>
              <p className="text-sm text-slate-400 mt-1">Real-time quality metrics</p>
            </div>

            {/* KPI Cards - Dark Theme */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <KpiCard title="Test Pass Rate" value={`${data.passRate}%`} />
              <KpiCard title="Open Defects" value={data.openDefects} />
              <KpiCard title="Automation Coverage" value={`${data.automationCoverage}%`} />
              <KpiCard title="Release Readiness" value={data.readinessScore} unit="/100" />
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-[#28374d] mb-6">
              {['Overview', 'Execution', 'Defects'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} 
                  className={`pb-3 font-semibold ${activeTab === tab.toLowerCase() ? 'border-b-2 border-blue-500 text-blue-400' : 'text-slate-500'}`}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#182232] p-6 rounded border border-[#28374d] shadow-sm">
                <h3 className="font-bold mb-4 text-slate-200">Test Result Breakdown</h3>
                <div className="h-64"><Doughnut data={{ labels: ['Passed', 'Failed'], datasets: [{ data: [data.passed, data.failed], backgroundColor: ['#48a43f', '#a94442'], borderWidth: 0 }] }} options={{ plugins: { legend: { labels: { color: '#94a3b8' } } } }} /></div>
              </div>
              <div className="bg-[#182232] p-6 rounded border border-[#28374d] shadow-sm">
                <h3 className="font-bold mb-4 text-slate-200">Pass Rate Trend</h3>
                <div className="h-64"><Line data={{ labels: ['Day 1', 'Day 2'], datasets: [{ label: 'Pass Rate', data: [90, 92], borderColor: '#276fbf', tension: 0.3 }] }} options={{ scales: { y: { ticks: { color: '#94a3b8' }, grid: { color: '#28374d' } }, x: { ticks: { color: '#94a3b8' }, grid: { color: '#28374d' } } } }} /></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function KpiCard({ title, value, unit = '' }: any) {
  return (
    <div className="bg-[#182232] p-5 rounded border border-[#28374d] shadow-sm">
      <p className="text-xs text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold mt-2 text-white">{value}{unit}</p>
    </div>
  );
}