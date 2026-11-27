'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import {
  Gauge,
  Users,
  Zap,
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  ChevronRight,
  Activity,
  Timer,
  ArrowUpRight,
  Download
} from 'lucide-react';

export default function PerformanceTestingPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsRunning(false);
            return 100;
          }
          return prev + 1;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const stats = [
    { label: 'Virtual Users', value: isRunning ? '1,240' : '0', icon: Users, color: 'text-blue-500', trend: '+12%' },
    { label: 'Avg. Latency', value: isRunning ? '248ms' : '0ms', icon: Timer, color: 'text-purple-500', trend: '-5ms' },
    { label: 'Throughput', value: isRunning ? '856 req/s' : '0 req/s', icon: Zap, color: 'text-yellow-500', trend: '+42' },
    { label: 'Error Rate', value: isRunning ? '0.04%' : '0.00%', icon: AlertCircle, color: 'text-red-500', trend: 'Stable' },
  ];

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Gauge className="w-6 h-6 text-indigo-500" />
                Performance Testing
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Load, stress, and scalability analysis for your SaaS infrastructure.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Download className="w-4 h-4" />
                Export Report
              </button>
              <button
                onClick={() => {
                  setIsRunning(!isRunning);
                  if (!isRunning) setProgress(0);
                }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
                }`}
              >
                {isRunning ? (
                  <><Square className="w-4 h-4 fill-current" /> Stop Test</>
                ) : (
                  <><Play className="w-4 h-4 fill-current" /> Run Load Test</>
                )}
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Live</span>
                </div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
                  <span className="text-xs font-medium text-emerald-500 flex items-center">
                    <ArrowUpRight className="w-3 h-3" />
                    {stat.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real-time Charts Placeholder */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Response Time Distribution (p95)</h3>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" /> API Gateway
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" /> Auth Service
                    </span>
                  </div>
                </div>

                {/* Simulated Chart */}
                <div className="h-64 w-full flex items-end gap-1 px-2 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                    {[1, 2, 3, 4].map(l => <div key={l} className="border-t border-slate-500 w-full" />)}
                  </div>

                  {Array.from({ length: 40 }).map((_, i) => {
                    const height = isRunning
                      ? Math.floor(Math.random() * 60) + 20
                      : 10;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-indigo-500/20 dark:bg-indigo-400/10 rounded-t-sm hover:bg-indigo-500 transition-all cursor-crosshair group relative"
                        style={{ height: `${height}%` }}
                      >
                        <div className="h-1 bg-indigo-500 w-full rounded-full" />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {height * 5}ms
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  <span>T-30m</span>
                  <span>T-15m</span>
                  <span>T-5m</span>
                  <span className="text-indigo-500">Now</span>
                </div>
              </div>

              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">Load Scenario Progress</h3>
                {isRunning ? (
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-300 font-medium italic">Scaling to 2,000 VUs...</span>
                      <span className="text-slate-500 font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Duration</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">10m 00s</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Target</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">2.5k VUs</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Region</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">us-east-1</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg italic">
                    <Activity className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-xs">Start a load test to see progress</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar / Info */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Load Generator</label>
                    <select className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option>Grafana k6 (Recommended)</option>
                      <option>Apache JMeter</option>
                      <option>Locust.io</option>
                      <option>Gatling</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Test Type</label>
                    <select className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option>Smoke Test</option>
                      <option>Load Test</option>
                      <option>Stress Test</option>
                      <option>Soak Test</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 italic">Enable Real-time Cloud Monitoring</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Recent Tests</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Checkout Peak Stress', date: '2h ago', status: 'Passed', score: '98/100' },
                    { name: 'Auth API Soak', date: '5h ago', status: 'Passed', score: '94/100' },
                    { name: 'Search Load 5k', date: 'Yesterday', status: 'Failed', score: '42/100' },
                  ].map((test, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${test.status === 'Passed' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{test.name}</p>
                          <p className="text-[10px] text-slate-500">{test.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${test.status === 'Passed' ? 'text-emerald-600' : 'text-red-600'}`}>{test.score}</p>
                        <ChevronRight className="w-3 h-3 text-slate-300 ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors border-t border-slate-50 dark:border-slate-800 pt-4">
                  View All History
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
