'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Download,
  Plus,
  Settings,
  Trash2,
  PlayCircle,
  BarChart2,
} from 'lucide-react';

interface PerformanceTest {
  id: string;
  name: string;
  description: string | null;
  test_type: string;
  status: string;
  virtual_users: number;
  duration_seconds: number;
  ramp_up_seconds: number;
  thresholds: Record<string, unknown>;
  metrics: Record<string, unknown>;
  summary: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface PerformanceTestResult {
  id: string;
  performance_test_id: string;
  timestamp: string;
  vus: number;
  rps: number;
  latency_p50: number;
  latency_p90: number;
  latency_p95: number;
  latency_p99: number;
  error_rate: number;
  checks_passed: number;
  checks_failed: number;
  data_received: number;
  data_sent: number;
}

export default function PerformanceTestingPage() {
  const [tests, setTests] = useState<PerformanceTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<PerformanceTest | null>(null);
  const [results, setResults] = useState<PerformanceTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    testType: 'load',
    virtualUsers: 100,
    durationSeconds: 300,
    rampUpSeconds: 60,
    baseUrl: '',
    endpoints: '' as string,
  });

  const fetchTests = useCallback(async () => {
    try {
      const res = await fetch('/api/performance-tests?projectId=current', { cache: 'no-store' });
      const data = await res.json();
      if (data.performanceTests) setTests(data.performanceTests);
    } catch (e) {
      console.error('Failed to fetch tests:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchResults = useCallback(async (testId: string) => {
    try {
      const res = await fetch(`/api/performance-tests/${testId}/results`, { cache: 'no-store' });
      const data = await res.json();
      if (data.results) setResults(data.results);
    } catch (e) {
      console.error('Failed to fetch results:', e);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  useEffect(() => {
    if (selectedTest) {
      fetchResults(selectedTest.id);
      // Poll for live updates when running
      if (selectedTest.status === 'running') {
        const interval = setInterval(() => fetchResults(selectedTest.id), 2000);
        return () => clearInterval(interval);
      }
    }
  }, [selectedTest, fetchResults]);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/performance-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'current', // Would come from project context
          name: formData.name,
          description: formData.description,
          testType: formData.testType,
          virtualUsers: formData.virtualUsers,
          durationSeconds: formData.durationSeconds,
          rampUpSeconds: formData.rampUpSeconds,
          configuration: {
            baseUrl: formData.baseUrl,
            endpoints: formData.endpoints.split(',').map(e => e.trim()).filter(Boolean),
          },
        }),
      });
      const data = await res.json();
      if (data.performanceTest) {
        setTests(prev => [data.performanceTest, ...prev]);
        setShowCreateModal(false);
        setFormData({ name: '', description: '', testType: 'load', virtualUsers: 100, durationSeconds: 300, rampUpSeconds: 60, baseUrl: '', endpoints: '' });
      }
    } catch (err) {
      console.error('Failed to create test:', err);
    }
  };

  const handleRunTest = async (testId: string) => {
    try {
      const res = await fetch(`/api/performance-tests/${testId}/run`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchTests();
        setSelectedTest(prev => prev ? { ...prev, status: 'running' } : null);
      }
    } catch (err) {
      console.error('Failed to run test:', err);
    }
  };

  const handleStopTest = async (testId: string) => {
    try {
      await fetch(`/api/performance-tests/${testId}/stop`, { method: 'POST' });
      fetchTests();
    } catch (err) {
      console.error('Failed to stop test:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const latestMetrics = results[results.length - 1];
  const isLive = selectedTest?.status === 'running';

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
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> New Test
            </button>
          </div>

          {/* Test List & Configuration Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold uppercase tracking-wider text-xs text-slate-500">Tests</h3>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-slate-500">Loading...</div>
                  ) : tests.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No performance tests yet</p>
                      <p className="text-xs mt-1">Create your first load test</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {tests.map(test => (
                        <li key={test.id}>
                          <button
                            onClick={() => setSelectedTest(test)}
                            className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                              selectedTest?.id === test.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{test.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                                  {test.test_type} • {test.virtual_users} VUs • {formatDuration(test.duration_seconds)}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(test.status)} shrink-0`}>
                                {test.status}
                              </span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content - Selected Test Details */}
            <div className="lg:col-span-3 space-y-6">
              {selectedTest ? (
                <>
                  {/* Live Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                      label="Virtual Users"
                      value={isLive && latestMetrics ? latestMetrics.vus.toLocaleString() : '0'}
                      icon={Users}
                      color="text-blue-500"
                      trend={isLive ? '+12%' : null}
                    />
                    <MetricCard
                      label="Avg. Latency"
                      value={isLive && latestMetrics ? `${latestMetrics.latency_p50}ms` : '0ms'}
                      icon={Timer}
                      color="text-purple-500"
                      trend={isLive ? '-5ms' : null}
                    />
                    <MetricCard
                      label="Throughput"
                      value={isLive && latestMetrics ? `${latestMetrics.rps.toLocaleString()} req/s` : '0 req/s'}
                      icon={Zap}
                      color="text-yellow-500"
                      trend={isLive ? '+42' : null}
                    />
                    <MetricCard
                      label="Error Rate"
                      value={isLive && latestMetrics ? `${(latestMetrics.error_rate * 100).toFixed(2)}%` : '0.00%'}
                      icon={AlertCircle}
                      color="text-red-500"
                      trend={isLive ? 'Stable' : null}
                    />
                  </div>

                  {/* Charts & Progress */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Response Time Distribution (p95)</h3>
                          <div className="flex gap-2">
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <div className="w-2 h-2 rounded-full bg-indigo-500" /> p50
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" /> p95
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-500">
                              <div className="w-2 h-2 rounded-full bg-amber-500" /> p99
                            </span>
                          </div>
                        </div>
                        <LatencyChart results={results} />
                      </div>

                      <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Throughput & VUs</h3>
                          {selectedTest.status === 'running' && (
                            <span className="flex items-center gap-1.5 text-xs text-blue-500 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              Live
                            </span>
                          )}
                        </div>
                        <ThroughputChart results={results} />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Test Controls</h3>
                        </div>
                        <div className="space-y-3">
                          {selectedTest.status === 'pending' || selectedTest.status === 'completed' || selectedTest.status === 'failed' ? (
                            <button
                              onClick={() => handleRunTest(selectedTest.id)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
                            >
                              <PlayCircle className="w-4 h-4 fill-current" /> Run Test
                            </button>
                          ) : selectedTest.status === 'running' ? (
                            <button
                              onClick={() => handleStopTest(selectedTest.id)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all"
                            >
                              <Square className="w-4 h-4 fill-current" /> Stop Test
                            </button>
                          ) : null}

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 mb-2">Configuration</p>
                            <dl className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <dt className="text-slate-500">Type</dt>
                                <dd className="font-medium capitalize">{selectedTest.test_type}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-slate-500">Virtual Users</dt>
                                <dd className="font-medium">{selectedTest.virtual_users.toLocaleString()}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-slate-500">Duration</dt>
                                <dd className="font-medium">{formatDuration(selectedTest.duration_seconds)}</dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-slate-500">Ramp Up</dt>
                                <dd className="font-medium">{formatDuration(selectedTest.ramp_up_seconds)}</dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Summary</h3>
                        {selectedTest.summary && Object.keys(selectedTest.summary).length > 0 ? (
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-slate-500">Total Requests</dt>
                              <dd className="font-bold">{(selectedTest.summary.totalRequests as number)?.toLocaleString() || '—'}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-slate-500">Pass Rate</dt>
                              <dd className="font-bold text-emerald-600">{(selectedTest.summary.passRate as number)?.toFixed(1) || '—'}%</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-slate-500">Avg Latency</dt>
                              <dd className="font-bold">{(selectedTest.summary.avgLatency as number)?.toFixed(0) || '—'}ms</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-slate-500">P95 Latency</dt>
                              <dd className="font-bold">{(selectedTest.summary.p95Latency as number)?.toFixed(0) || '—'}ms</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-slate-500">Error Rate</dt>
                              <dd className="font-bold text-red-600">{(selectedTest.summary.errorRate as number)?.toFixed(2) || '—'}%</dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="text-slate-400 text-sm italic">Run a test to see summary</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="lg:col-span-3">
                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-12 text-center">
                    <Activity className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Select a Test</h3>
                    <p className="text-slate-500 dark:text-slate-400">Choose a performance test from the sidebar to view details and run it</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Create Test Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white dark:bg-[#182232] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
                <h3 className="text-lg font-bold mb-4">Create Performance Test</h3>
                <form onSubmit={handleCreateTest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Test Type</label>
                      <select
                        value={formData.testType}
                        onChange={e => setFormData(prev => ({ ...prev, testType: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="load">Load Test</option>
                        <option value="stress">Stress Test</option>
                        <option value="spike">Spike Test</option>
                        <option value="soak">Soak Test</option>
                        <option value="smoke">Smoke Test</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Virtual Users</label>
                      <input
                        type="number"
                        value={formData.virtualUsers}
                        onChange={e => setFormData(prev => ({ ...prev, virtualUsers: parseInt(e.target.value) }))}
                        className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Duration (seconds)</label>
                      <input
                        type="number"
                        value={formData.durationSeconds}
                        onChange={e => setFormData(prev => ({ ...prev, durationSeconds: parseInt(e.target.value) }))}
                        className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ramp Up (seconds)</label>
                      <input
                        type="number"
                        value={formData.rampUpSeconds}
                        onChange={e => setFormData(prev => ({ ...prev, rampUpSeconds: parseInt(e.target.value) }))}
                        className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Base URL</label>
                    <input
                      type="text"
                      value={formData.baseUrl}
                      onChange={e => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://api.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Endpoints (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.endpoints}
                      onChange={e => setFormData(prev => ({ ...prev, endpoints: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="/api/health, /api/users, /api/orders"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                    >
                      Create Test
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, trend }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend: string | null;
}) {
  return (
    <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Live</span>}
      </div>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</h3>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
        {trend && (
          <span className="text-xs font-medium text-emerald-500 flex items-center">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function LatencyChart({ results }: { results: PerformanceTestResult[] }) {
  if (!results.length) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg">
        <Activity className="w-8 h-8 mb-2 opacity-20" />
        <span className="text-xs">Run a test to see latency data</span>
      </div>
    );
  }

  const maxLatency = Math.max(...results.map(r => r.latency_p99));
  const dataPoints = results.slice(-40);

  return (
    <div className="h-64 w-full flex items-end gap-1 px-2 relative">
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
        {[1, 2, 3, 4].map(l => <div key={l} className="border-t border-slate-500 w-full" />)}
      </div>
      {dataPoints.map((point, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
          <div
            className="w-full bg-emerald-500/20 dark:bg-emerald-400/10 rounded-t-sm transition-all cursor-crosshair group relative"
            style={{ height: `${Math.max((point.latency_p50 / maxLatency) * 100, 2)}%` }}
          >
            <div className="h-1 bg-emerald-500 w-full rounded-full" />
          </div>
          <div
            className="w-full bg-amber-500/20 dark:bg-amber-400/10 rounded-t-sm transition-all cursor-crosshair group relative"
            style={{ height: `${Math.max((point.latency_p95 / maxLatency) * 100, 2)}%` }}
          >
            <div className="h-1 bg-amber-500 w-full rounded-full" />
          </div>
          <div
            className="w-full bg-red-500/20 dark:bg-red-400/10 rounded-t-sm transition-all cursor-crosshair group relative"
            style={{ height: `${Math.max((point.latency_p99 / maxLatency) * 100, 2)}%` }}
          >
            <div className="h-1 bg-red-500 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThroughputChart({ results }: { results: PerformanceTestResult[] }) {
  if (!results.length) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg">
        <Activity className="w-8 h-8 mb-2 opacity-20" />
        <span className="text-xs">Run a test to see throughput data</span>
      </div>
    );
  }

  const maxRPS = Math.max(...results.map(r => r.rps));
  const dataPoints = results.slice(-40);

  return (
    <div className="h-48 w-full flex items-end gap-1 px-2 relative">
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
        {[1, 2, 3, 4].map(l => <div key={l} className="border-t border-slate-500 w-full" />)}
      </div>
      {dataPoints.map((point, i) => (
        <div
          key={i}
          className="flex-1 bg-indigo-500/20 dark:bg-indigo-400/10 rounded-t-sm hover:bg-indigo-500 transition-all cursor-crosshair group relative"
          style={{ height: `${Math.max((point.rps / maxRPS) * 100, 2)}%` }}
        >
          <div className="h-full bg-indigo-500 w-full rounded-t-sm" />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {point.rps.toFixed(0)} rps
          </div>
        </div>
      ))}
    </div>
  );
}