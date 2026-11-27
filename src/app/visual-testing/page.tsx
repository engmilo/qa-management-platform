'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import {
  Eye,
  Layout,
  Maximize2,
  ChevronRight,
  Camera,
  Plus,
  PlayCircle,
  Check,
  AlertTriangle,
  Square,
  RefreshCw,
  Trash2,
  FileText,
} from 'lucide-react';

interface VisualProject {
  id: string;
  name: string;
  description: string | null;
  browsers: string[];
  viewports: Array<{ width: number; height: number }>;
  threshold: number;
  created_at: string;
}

interface VisualBaseline {
  id: string;
  name: string;
  url: string;
  selector: string | null;
  browser: string;
  viewport_width: number;
  viewport_height: number;
  screenshot_url: string | null;
  status: string;
  created_at: string;
}

interface VisualRun {
  id: string;
  name: string | null;
  status: string;
  branch: string | null;
  commit_sha: string | null;
  started_at: string | null;
  completed_at: string | null;
  summary: Record<string, unknown>;
  created_at: string;
}

interface VisualResult {
  id: string;
  run_id: string;
  baseline_id: string;
  status: string;
  diff_percentage: number;
  diff_pixels: number;
  total_pixels: number;
  actual_screenshot_url: string | null;
  diff_screenshot_url: string | null;
  browser: string;
  viewport_width: number;
  viewport_height: number;
  executed_at: string;
}

export default function VisualTestingPage() {
  const [projects, setProjects] = useState<VisualProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<VisualProject | null>(null);
  const [baselines, setBaselines] = useState<VisualBaseline[]>([]);
  const [runs, setRuns] = useState<VisualRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<VisualRun | null>(null);
  const [runResults, setRunResults] = useState<VisualResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'baselines' | 'runs' | 'results'>('baselines');
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showCreateBaselineModal, setShowCreateBaselineModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', threshold: 0.01 });
  const [baselineForm, setBaselineForm] = useState({ name: '', url: '', selector: '', browser: 'chromium', width: 1280, height: 720 });

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/visual-test-projects?projectId=current', { cache: 'no-store' });
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch (e) {
      console.error('Failed to fetch visual test projects:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBaselines = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/visual-test-projects/${projectId}/baselines`, { cache: 'no-store' });
      const data = await res.json();
      if (data.baselines) setBaselines(data.baselines);
    } catch (e) {
      console.error('Failed to fetch baselines:', e);
    }
  }, []);

  const fetchRuns = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/visual-test-projects/${projectId}/runs`, { cache: 'no-store' });
      const data = await res.json();
      if (data.runs) setRuns(data.runs);
    } catch (e) {
      console.error('Failed to fetch runs:', e);
    }
  }, []);

  const fetchRunResults = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/visual-test-runs/${runId}/results`, { cache: 'no-store' });
      const data = await res.json();
      if (data.results) setRunResults(data.results);
    } catch (e) {
      console.error('Failed to fetch run results:', e);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProject) {
      fetchBaselines(selectedProject.id);
      fetchRuns(selectedProject.id);
      setActiveTab('baselines');
    }
  }, [selectedProject, fetchBaselines, fetchRuns]);

  useEffect(() => {
    if (selectedRun) {
      fetchRunResults(selectedRun.id);
      setActiveTab('results');
      if (selectedRun.status === 'running') {
        const interval = setInterval(() => fetchRunResults(selectedRun.id), 2000);
        return () => clearInterval(interval);
      }
    }
  }, [selectedRun, fetchRunResults]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/visual-test-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'current',
          name: projectForm.name,
          description: projectForm.description,
          threshold: projectForm.threshold,
        }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects(prev => [data.project, ...prev]);
        setShowCreateProjectModal(false);
        setProjectForm({ name: '', description: '', threshold: 0.01 });
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleCreateBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/visual-test-projects/${selectedProject.id}/baselines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: baselineForm.name,
          url: baselineForm.url,
          selector: baselineForm.selector || null,
          browser: baselineForm.browser,
          viewportWidth: baselineForm.width,
          viewportHeight: baselineForm.height,
        }),
      });
      const data = await res.json();
      if (data.baseline) {
        setBaselines(prev => [data.baseline, ...prev]);
        setShowCreateBaselineModal(false);
        setBaselineForm({ name: '', url: '', selector: '', browser: 'chromium', width: 1280, height: 720 });
      }
    } catch (err) {
      console.error('Failed to create baseline:', err);
    }
  };

  const handleRunVisualTest = async (projectId: string) => {
    try {
      const res = await fetch(`/api/visual-test-projects/${projectId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Run ${new Date().toLocaleTimeString()}` }),
      });
      const data = await res.json();
      if (data.run) {
        fetchRuns(projectId);
        setSelectedRun(data.run);
      }
    } catch (err) {
      console.error('Failed to run visual test:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'approved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'changes_detected': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
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
                <Eye className="w-6 h-6 text-pink-500" />
                Visual Testing
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Detect layout regressions, rendering bugs, and style inconsistencies.
              </p>
            </div>
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Projects Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold uppercase tracking-wider text-xs text-slate-500">Visual Projects</h3>
                </div>
                <div className="max-h-[700px] overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-slate-500">Loading...</div>
                  ) : projects.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Eye className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No visual projects yet</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {projects.map(project => (
                        <li key={project.id}>
                          <button
                            onClick={() => setSelectedProject(project)}
                            className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                              selectedProject?.id === project.id ? 'bg-pink-50 dark:bg-pink-900/20 border-l-2 border-pink-500' : ''
                            }`}
                          >
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{project.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                              Threshold: {(project.threshold * 100).toFixed(1)}%
                            </p>
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
              {selectedProject && activeTab === 'baselines' && (
                <>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab('baselines')}
                        className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${
                          activeTab === 'baselines' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Baselines ({baselines.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('runs')}
                        className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${
                          activeTab === 'runs' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Runs ({runs.length})
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCreateBaselineModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Baseline
                      </button>
                      <button
                        onClick={() => handleRunVisualTest(selectedProject.id)}
                        disabled={baselines.length === 0}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md disabled:opacity-50"
                      >
                        <PlayCircle className="w-4 h-4 fill-current" /> Run Visual Test
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {baselines.map(baseline => (
                      <div key={baseline.id} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
                        <div className="h-40 bg-slate-100 dark:bg-[#111720] relative flex items-center justify-center">
                          <Camera className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{baseline.name}</h3>
                          <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{baseline.url}</p>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{baseline.browser} • {baseline.viewport_width}x{baseline.viewport_height}</span>
                            <span className="text-xs font-bold text-emerald-600">Active</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {baselines.length === 0 && (
                      <div className="col-span-full bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-12 text-center text-slate-400">
                        <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No baselines configured</p>
                        <p className="text-xs mt-1">Add a baseline screenshot to start visual regression testing</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedProject && activeTab === 'runs' && (
                <>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setActiveTab('baselines')}
                      className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      Baselines
                    </button>
                    <button
                      onClick={() => setActiveTab('runs')}
                      className="px-4 py-2 text-xs font-bold uppercase rounded-lg bg-indigo-600 text-white"
                    >
                      Runs
                    </button>
                  </div>
                  <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {runs.map(run => (
                        <button
                          key={run.id}
                          onClick={() => setSelectedRun(run)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex justify-between items-center"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${run.status === 'running' ? 'bg-blue-500 animate-pulse' : run.status === 'completed' || run.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{run.name || `Run ${run.id.slice(0, 8)}`}</p>
                              <p className="text-[10px] text-slate-500">{new Date(run.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(run.status)}`}>
                            {run.status}
                          </span>
                        </button>
                      ))}
                      {runs.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                          <PlayCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No visual test runs yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {selectedRun && (
                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold">Run Results</h3>
                      <p className="text-xs text-slate-500">{selectedRun.name || selectedRun.id}</p>
                    </div>
                    <button onClick={() => setSelectedRun(null)} className="text-xs font-bold text-indigo-500 hover:underline">Back to Baselines</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {runResults.map(res => (
                      <div key={res.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(res.status)}`}>
                            {res.status}
                          </span>
                          <span className="text-xs font-mono text-slate-500">Diff: {(res.diff_percentage || 0).toFixed(2)}%</span>
                        </div>
                        <div className="h-32 bg-slate-100 dark:bg-[#111720] rounded-lg flex items-center justify-center">
                          <Camera className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{res.browser}</span>
                          <span>{res.viewport_width}x{res.viewport_height}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedProject && (
                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-12 text-center text-slate-400">
                  <Eye className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Select a Visual Project</h3>
                  <p className="text-sm">Choose a project from the sidebar to manage baselines and run visual tests</p>
                </div>
              )}
            </div>
          </div>

          {/* Create Project Modal */}
          {showCreateProjectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white dark:bg-[#182232] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
                <h3 className="text-lg font-bold mb-4">Create Visual Project</h3>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Project Name</label>
                    <input
                      type="text"
                      value={projectForm.name}
                      onChange={e => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                    <textarea
                      value={projectForm.description}
                      onChange={e => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Pixel Diff Threshold (e.g. 0.01 for 1%)</label>
                    <input
                      type="number"
                      step="0.005"
                      min="0"
                      max="1"
                      value={projectForm.threshold}
                      onChange={e => setProjectForm(prev => ({ ...prev, threshold: parseFloat(e.target.value) }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateProjectModal(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Create Baseline Modal */}
          {showCreateBaselineModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white dark:bg-[#182232] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
                <h3 className="text-lg font-bold mb-4">Add Visual Baseline</h3>
                <form onSubmit={handleCreateBaseline} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Screen Name</label>
                    <input
                      type="text"
                      value={baselineForm.name}
                      onChange={e => setBaselineForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                      placeholder="Homepage"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">URL</label>
                    <input
                      type="text"
                      value={baselineForm.url}
                      onChange={e => setBaselineForm(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                      placeholder="https://app.example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">CSS Selector (Optional)</label>
                    <input
                      type="text"
                      value={baselineForm.selector}
                      onChange={e => setBaselineForm(prev => ({ ...prev, selector: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                      placeholder="#main-content"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Browser</label>
                      <select
                        value={baselineForm.browser}
                        onChange={e => setBaselineForm(prev => ({ ...prev, browser: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-sm outline-none"
                      >
                        <option value="chromium">Chromium</option>
                        <option value="firefox">Firefox</option>
                        <option value="webkit">WebKit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Width</label>
                      <input
                        type="number"
                        value={baselineForm.width}
                        onChange={e => setBaselineForm(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                        className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Height</label>
                      <input
                        type="number"
                        value={baselineForm.height}
                        onChange={e => setBaselineForm(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                        className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateBaselineModal(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                    >
                      Add Baseline
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