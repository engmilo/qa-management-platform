'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import {
  Webhook,
  PlayCircle,
  Check,
  AlertTriangle,
  Search,
  ChevronRight,
  ShieldCheck,
  Code2,
  Plus,
  FileJson,
  Trash2,
  Play,
  Square,
  RotateCw,
  Eye,
  Edit,
  Download,
  Upload,
} from 'lucide-react';

interface APICollection {
  id: string;
  name: string;
  description: string | null;
  spec_type: string;
  spec_content: Record<string, unknown>;
  base_url: string | null;
  headers: Record<string, unknown>;
  auth_config: Record<string, unknown>;
  created_at: string;
  _count?: { test_cases: number };
}

interface APITestCase {
  id: string;
  collection_id: string;
  name: string;
  method: string;
  path: string;
  headers: Record<string, unknown>;
  query_params: Record<string, unknown>;
  body: unknown;
  assertions: unknown[];
  test_type: string;
  order_index: number;
}

interface APIRun {
  id: string;
  collection_id: string;
  name: string | null;
  status: string;
  environment: string | null;
  variables: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  summary: Record<string, unknown>;
  created_at: string;
}

interface APIResult {
  id: string;
  run_id: string;
  test_case_id: string;
  status: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  response_time_ms: number;
  status_code: number;
  assertions_passed: number;
  assertions_failed: number;
  assertion_details: unknown[];
  error_message: string | null;
  executed_at: string;
}

export default function APITestingPage() {
  const [collections, setCollections] = useState<APICollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<APICollection | null>(null);
  const [testCases, setTestCases] = useState<APITestCase[]>([]);
  const [runs, setRuns] = useState<APIRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<APIRun | null>(null);
  const [runResults, setRunResults] = useState<APIResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'collections' | 'runs' | 'results'>('collections');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    specType: 'postman',
    baseUrl: '',
    specContent: '',
  });

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/api-test-collections?projectId=current', { cache: 'no-store' });
      const data = await res.json();
      if (data.collections) setCollections(data.collections);
    } catch (e) {
      console.error('Failed to fetch collections:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTestCases = useCallback(async (collectionId: string) => {
    try {
      const res = await fetch(`/api/api-test-collections/${collectionId}/test-cases`, { cache: 'no-store' });
      const data = await res.json();
      if (data.testCases) setTestCases(data.testCases);
    } catch (e) {
      console.error('Failed to fetch test cases:', e);
    }
  }, []);

  const fetchRuns = useCallback(async (collectionId: string) => {
    try {
      const res = await fetch(`/api/api-test-collections/${collectionId}/runs`, { cache: 'no-store' });
      const data = await res.json();
      if (data.runs) setRuns(data.runs);
    } catch (e) {
      console.error('Failed to fetch runs:', e);
    }
  }, []);

  const fetchRunResults = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/api-test-runs/${runId}/results`, { cache: 'no-store' });
      const data = await res.json();
      if (data.results) setRunResults(data.results);
    } catch (e) {
      console.error('Failed to fetch run results:', e);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    if (selectedCollection) {
      fetchTestCases(selectedCollection.id);
      fetchRuns(selectedCollection.id);
      setActiveTab('collections');
    }
  }, [selectedCollection, fetchTestCases, fetchRuns]);

  useEffect(() => {
    if (selectedRun) {
      fetchRunResults(selectedRun.id);
      setActiveTab('results');
      // Poll for live updates when running
      if (selectedRun.status === 'running') {
        const interval = setInterval(() => fetchRunResults(selectedRun.id), 2000);
        return () => clearInterval(interval);
      }
    }
  }, [selectedRun, fetchRunResults]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let specContent: Record<string, unknown> = {};
      if (formData.specContent) {
        try {
          specContent = JSON.parse(formData.specContent);
        } catch {
          // If not valid JSON, store as empty object
        }
      }

      const res = await fetch('/api/api-test-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'current',
          name: formData.name,
          description: formData.description,
          specType: formData.specType,
          baseUrl: formData.baseUrl,
          specContent,
        }),
      });
      const data = await res.json();
      if (data.collection) {
        setCollections(prev => [data.collection, ...prev]);
        setShowCreateModal(false);
        setShowImportModal(false);
        setFormData({ name: '', description: '', specType: 'postman', baseUrl: '', specContent: '' });
      }
    } catch (err) {
      console.error('Failed to create collection:', err);
    }
  };

  const handleImportPostman = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let collectionJson: unknown;
      try {
        collectionJson = JSON.parse(formData.specContent);
      } catch {
        alert('Invalid JSON');
        return;
      }

      const res = await fetch('/api/api-test-collections/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'current',
          collection: collectionJson,
        }),
      });
      const data = await res.json();
      if (data.collection) {
        setCollections(prev => [data.collection, ...prev]);
        setShowImportModal(false);
        setFormData({ name: '', description: '', specType: 'postman', baseUrl: '', specContent: '' });
      }
    } catch (err) {
      console.error('Failed to import collection:', err);
    }
  };

  const handleRunCollection = async (collectionId: string) => {
    try {
      const res = await fetch(`/api/api-test-collections/${collectionId}/run`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.run) {
        fetchRuns(collectionId);
        setSelectedRun(data.run);
      }
    } catch (err) {
      console.error('Failed to run collection:', err);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'POST': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'PUT': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'PATCH': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'passed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
      case 'skipped': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-emerald-600 dark:text-emerald-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'skipped': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Webhook className="w-6 h-6 text-cyan-500" />
                API Testing
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Contract, functional, and performance testing for your backend services.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Upload className="w-4 h-4" /> Import Postman
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" /> New Collection
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Collections Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold uppercase tracking-wider text-xs text-slate-500">Collections</h3>
                </div>
                <div className="max-h-[700px] overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-slate-500">Loading...</div>
                  ) : collections.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Code2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No API collections yet</p>
                      <p className="text-xs mt-1">Create or import a Postman collection</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {collections.map(collection => (
                        <li key={collection.id}>
                          <button
                            onClick={() => setSelectedCollection(collection)}
                            className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                              selectedCollection?.id === collection.id ? 'bg-cyan-50 dark:bg-cyan-900/20 border-l-2 border-cyan-500' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{collection.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                                  {collection.spec_type} • {collection._count?.test_cases || 0} tests
                                </p>
                                {collection.base_url && (
                                  <p className="text-[10px] text-slate-400 font-mono truncate mt-1">{collection.base_url}</p>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 shrink-0`}>
                                {collection.spec_type}
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

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {selectedCollection && activeTab === 'collections' && (
                <>
                  {/* Test Cases */}
                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold uppercase tracking-wider text-xs text-slate-500">Test Cases</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRunCollection(selectedCollection.id)}
                          disabled={testCases.length === 0}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlayCircle className="w-4 h-4 fill-current" /> Run Collection
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50/50 dark:bg-[#111720]">
                          <tr>
                            <th className="px-6 py-3">Method</th>
                            <th className="px-6 py-3">Path</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Assertions</th>
                            <th className="px-6 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {testCases.map(tc => (
                            <tr key={tc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getMethodColor(tc.method)}`}>
                                  {tc.method}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-slate-900 dark:text-white truncate max-w-[300px]">
                                {tc.path}
                              </td>
                              <td className="px-6 py-4 text-slate-900 dark:text-white">{tc.name}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                  {tc.test_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-500">
                                {(tc.assertions as unknown[]).length} checks
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1">
                                  <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="View">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Edit">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {testCases.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                No test cases in this collection
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent Runs */}
                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold uppercase tracking-wider text-xs text-slate-500">Recent Runs</h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {runs.map(run => (
                        <button
                          key={run.id}
                          onClick={() => setSelectedRun(run)}
                          className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex justify-between items-center ${
                            selectedRun?.id === run.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${run.status === 'running' ? 'bg-blue-500 animate-pulse' : run.status === 'passed' ? 'bg-emerald-500' : run.status === 'failed' ? 'bg-red-500' : 'bg-slate-400'}`} />
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{run.name || `Run ${run.id.slice(0, 8)}`}</p>
                              <p className="text-[10px] text-slate-500">{new Date(run.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(run.status)}`}>
                              {run.status}
                            </span>
                            {run.summary && typeof run.summary === 'object' && 'passRate' in run.summary && (
                              <span className="text-xs font-bold text-slate-500">
                                {(run.summary.passRate as number).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                      {runs.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                          <PlayCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No runs yet</p>
                          <p className="text-xs mt-1">Run the collection to see results</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Run Results */}
              {selectedRun && activeTab === 'results' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <ResultMetricCard
                      label="Total Tests"
                      value={selectedRun.summary && typeof selectedRun.summary === 'object' && 'total' in selectedRun.summary ? (selectedRun.summary.total as number) : runResults.length}
                      icon={FileJson}
                      color="text-indigo-500"
                    />
                    <ResultMetricCard
                      label="Passed"
                      value={selectedRun.summary && typeof selectedRun.summary === 'object' && 'passed' in selectedRun.summary ? (selectedRun.summary.passed as number) : runResults.filter(r => r.status === 'passed').length}
                      icon={Check}
                      color="text-emerald-500"
                    />
                    <ResultMetricCard
                      label="Failed"
                      value={selectedRun.summary && typeof selectedRun.summary === 'object' && 'failed' in selectedRun.summary ? (selectedRun.summary.failed as number) : runResults.filter(r => r.status === 'failed').length}
                      icon={AlertTriangle}
                      color="text-red-500"
                    />
                    <ResultMetricCard
                      label="Pass Rate"
                      value={selectedRun.summary && typeof selectedRun.summary === 'object' && 'passRate' in selectedRun.summary ? `${(selectedRun.summary.passRate as number).toFixed(1)}%` : runResults.length ? `${((runResults.filter(r => r.status === 'passed').length / runResults.length) * 100).toFixed(1)}%` : '0%'}
                      icon={RotateCw}
                      color="text-blue-500"
                    />
                  </div>

                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold uppercase tracking-wider text-xs text-slate-500">Results</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(selectedRun.status)}`}>
                          {selectedRun.status}
                        </span>
                        {selectedRun.status === 'running' && (
                          <span className="flex items-center gap-1.5 text-xs text-blue-500 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Running...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50/50 dark:bg-[#111720]">
                          <tr>
                            <th className="px-6 py-3">Test</th>
                            <th className="px-6 py-3">Method</th>
                            <th className="px-6 py-3">Path</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Status Code</th>
                            <th className="px-6 py-3">Response Time</th>
                            <th className="px-6 py-3">Assertions</th>
                            <th className="px-6 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {runResults.map(result => {
                            const tc = testCases.find(t => t.id === result.test_case_id);
                            return (
                              <tr key={result.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                                  {tc?.name || result.test_case_id.slice(0, 8)}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tc ? getMethodColor(tc.method) : 'bg-slate-100 text-slate-700'}`}>
                                    {tc?.method || '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                                  {tc?.path || '—'}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(result.status)}`}>
                                    {result.status === 'passed' && <Check className="w-3 h-3" />}
                                    {result.status === 'failed' && <AlertTriangle className="w-3 h-3" />}
                                    {result.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs">
                                  {result.status_code || '—'}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                  {result.response_time_ms}ms
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`text-xs font-bold ${getResultStatusColor('passed')}`}>
                                    {result.assertions_passed} passed
                                  </span>
                                  {result.assertions_failed > 0 && (
                                    <span className={`ml-2 text-xs font-bold ${getResultStatusColor('failed')}`}>
                                      {result.assertions_failed} failed
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="View Details">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {runResults.length === 0 && (
                            <tr>
                              <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                                No results yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Empty State */}
              {!selectedCollection && (
                <div className="lg:col-span-3">
                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-12 text-center">
                    <Code2 className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Select a Collection</h3>
                    <p className="text-slate-500 dark:text-slate-400">Choose an API collection from the sidebar to view test cases and run tests</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Create Collection Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white dark:bg-[#182232] rounded-xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Create API Collection</h3>
                <form onSubmit={handleCreateCollection} className="space-y-4">
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
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Spec Type</label>
                      <select
                        value={formData.specType}
                        onChange={e => setFormData(prev => ({ ...prev, specType: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="postman">Postman Collection</option>
                        <option value="openapi">OpenAPI/Swagger</option>
                      </select>
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
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Spec Content (JSON)</label>
                    <textarea
                      value={formData.specContent}
                      onChange={e => setFormData(prev => ({ ...prev, specContent: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      rows={10}
                      placeholder='{ "info": { "name": "My API" }, "item": [...] }'
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setShowCreateModal(false); setFormData({ name: '', description: '', specType: 'postman', baseUrl: '', specContent: '' }); }}
                      className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                    >
                      Create Collection
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Import Postman Modal */}
          {showImportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white dark:bg-[#182232] rounded-xl p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Import Postman Collection</h3>
                <form onSubmit={handleImportPostman} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Paste Postman Collection JSON</label>
                    <textarea
                      value={formData.specContent}
                      onChange={e => setFormData(prev => ({ ...prev, specContent: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      rows={15}
                      placeholder='Paste your exported Postman collection JSON here...'
                    />
                  </div>
                  <p className="text-xs text-slate-500">Export from Postman: Collection → Export → Collection v2.1</p>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setShowImportModal(false); setFormData({ name: '', description: '', specType: 'postman', baseUrl: '', specContent: '' }); }}
                      className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg"
                    >
                      Import Collection
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

function ResultMetricCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</h3>
      <div className="mt-1">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, trend }: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: string | null;
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
            <span className="w-3 h-3" /> {trend}
          </span>
        )}
      </div>
    </div>
  );
}