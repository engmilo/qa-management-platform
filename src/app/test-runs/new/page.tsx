'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { inputCls, labelCls, FormField, FormSelect, FormActions } from '@/components/ui/form-fields';

type Project = { id: string; name: string };
type Plan = { id: string; name: string; project_id?: string };
type Suite = { id: string; name: string; test_plan_id?: string };
type TestCase = { id: string; name: string; test_plan_id?: string; suite_id?: string };

function extractList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== 'object') return [];
  const keys = ['data', 'test_plans', 'testPlans', 'plans', 'projects', 'test_suites', 'testSuites', 'suites', 'test_cases', 'testCases', 'cases', 'items', 'results', 'rows'];
  for (const k of keys) {
    const v = (data as any)[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      const nested = extractList(v);
      if (nested.length > 0) return nested;
    }
  }
  for (const v of Object.values(data as any)) {
    if (Array.isArray(v)) return v;
  }
  return [];
}

function normalizeProjects(data: any): Project[] {
  return extractList(data).map((r: any) => ({
    id: String(r?.id ?? r?.project_id ?? ''),
    name: String(r?.name ?? r?.title ?? r?.key ?? ''),
  })).filter((p) => p.id && p.name);
}
function normalizePlans(data: any): Plan[] {
  return extractList(data).map((r: any) => ({
    id: String(r?.id ?? r?.plan_id ?? r?.test_plan_id ?? ''),
    name: String(r?.name ?? r?.title ?? r?.plan_name ?? ''),
    project_id: r?.project_id ?? r?.projectId ?? r?.project_id,
  })).filter((p) => p.id && p.name);
}
function normalizeSuites(data: any): Suite[] {
  return extractList(data).map((r: any) => ({
    id: String(r?.id ?? r?.suite_id ?? ''),
    name: String(r?.name ?? r?.title ?? r?.suite_name ?? ''),
    test_plan_id: r?.test_plan_id ?? r?.testPlanId ?? r?.plan_id,
  })).filter((s) => s.id && s.name);
}
function normalizeCases(data: any): TestCase[] {
  return extractList(data).map((r: any) => ({
    id: String(r?.id ?? r?.case_id ?? r?.test_case_id ?? ''),
    name: String(r?.key ? `${r.key} — ${r.title || r.name || ''}` : (r?.title ?? r?.name ?? r?.case_name ?? '')),
    test_plan_id: r?.test_plan_id ?? r?.testPlanId,
    suite_id: r?.suite_id ?? r?.suiteId,
  })).filter((c) => c.id && c.name);
}

export default function NewTestRunPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [allSuites, setAllSuites] = useState<Suite[]>([]);
  const [allCases, setAllCases] = useState<TestCase[]>([]);
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [planId, setPlanId] = useState('');
  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const list = normalizeProjects(d); setProjects(list); if (list.length > 0) setProjectId(list[0].id);
    }).catch(() => {});

    setPlansLoading(true);
    fetch('/api/test-plans', { cache: 'no-store' }).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || `Test Plans API failed: ${r.status}`);
      const list = normalizePlans(d);
      if (list.length === 0) console.log('[test-runs/new] /api/test-plans raw:', d);
      setAllPlans(list);
      if (list.length === 0) setPlansError('No test plans found. Create a Test Plan first.');
    }).catch((e) => setPlansError(e instanceof Error ? e.message : 'Could not load test plans.')).finally(() => setPlansLoading(false));

    fetch('/api/test-suites', { cache: 'no-store' }).then((r) => r.json()).then((d) => setAllSuites(normalizeSuites(d))).catch(() => {});
    fetch('/api/test-cases', { cache: 'no-store' }).then((r) => r.json()).then((d) => setAllCases(normalizeCases(d))).catch(() => {});
  }, []);

  // Plans for selected project — if plans carry project_id, filter; if not, show all
  const plansForProject = (() => {
    if (!projectId) return allPlans;
    const withProject = allPlans.filter((p) => p.project_id);
    if (withProject.length === 0) return allPlans;
    const filtered = allPlans.filter((p) => p.project_id === projectId);
    return filtered.length > 0 ? filtered : allPlans;
  })();

  // Keep planId valid when project changes
  useEffect(() => {
    if (plansForProject.length > 0 && !plansForProject.some((p) => p.id === planId)) {
      setPlanId(plansForProject[0].id);
      setSelectedSuites([]);
      setSelectedCases([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, allPlans]);

  const handleProjectChange = (v: string) => {
    setProjectId(v);
    setSelectedSuites([]);
    setSelectedCases([]);
  };
  const handlePlanChange = (v: string) => {
    setPlanId(v);
    setSelectedSuites([]);
    setSelectedCases([]);
  };

  const suitesForPlan = planId ? allSuites.filter((s) => !s.test_plan_id || s.test_plan_id === planId) : allSuites;
  const casesForPlan = planId ? allCases.filter((c) => !c.test_plan_id || c.test_plan_id === planId) : allCases;

  const toggleSuite = (id: string) => setSelectedSuites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleCase = (id: string) => setSelectedCases((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!projectId) { setError('Select a project.'); return; }
    if (!name.trim()) { setError('Test Run Name is required.'); return; }
    if (!planId) { setError('Select a test plan.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          test_run_name: name.trim(),
          title: name.trim(),
          // Project — this was missing, API requires it
          project_id: projectId,
          projectId: projectId,
          // Plan — send every alias the API might read
          testPlanId: planId,
          test_plan_id: planId,
          test_planId: planId,
          plan_id: planId,
          suiteIds: selectedSuites,
          caseIds: selectedCases,
          assignedTo: assignedTo.trim() || null,
          assigned_to: assignedTo.trim() || null,
          description: description.trim(),
          configuration: configuration.trim(),
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'Could not create test run.');
      const runId = result.testRun?.id || result.id || result.run?.id || result.data?.id;
      router.push(runId ? `/test-runs/${runId}` : '/test-runs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create test run.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-xs mb-4">
              <Link href="/test-runs" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Back to Test Runs</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">Add Test Run</span>
            </div>

            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d]">
                <h1 className="dark:text-white text-base font-bold text-slate-900 tracking-tight">Add Test Run</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Execute a test plan — per-step results included</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-2.5 text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded">{error}</div>
                )}

                <FormSelect
                  label="PROJECT *"
                  value={projectId}
                  onChange={handleProjectChange}
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Select a project"
                />

                <FormField label="TEST RUN NAME *">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Smoke Test — Build 1.0.4 - Run 2" className={inputCls} />
                </FormField>

                <FormSelect
                  label="TEST PLAN *"
                  value={planId}
                  onChange={handlePlanChange}
                  options={plansForProject.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder={plansLoading ? 'Loading test plans...' : plansError ? 'No test plans found' : 'Select a test plan'}
                />
                {plansError && !plansLoading && (
                  <p className="text- text-amber-600 dark:text-amber-400 -mt-2">{plansError}</p>
                )}
                {!plansLoading && plansForProject.length > 0 && (
                  <p className="text- text-slate-500 dark:text-slate-400 -mt-2">{plansForProject.length} plan(s) loaded</p>
                )}

                <div>
                  <span className={labelCls}>SUITES (OPTIONAL — EMPTY = ALL)</span>
                  <div className="border border-[#d8dee4] dark:border-[#28374d] rounded bg-white dark:bg-[#101622] max-h-40 overflow-y-auto p-2 space-y-1">
                    {suitesForPlan.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-1">No suites for this plan.</p>}
                    {suitesForPlan.map((s) => (
                      <label key={s.id} className="flex items-start gap-2 px-1 py-1 rounded hover:bg-slate-50 dark:hover:bg-[#1e2a3a] cursor-pointer">
                        <input type="checkbox" checked={selectedSuites.includes(s.id)} onChange={() => toggleSuite(s.id)} className="mt-0.5 accent-[#48a43f]" />
                        <span className="text-xs text-slate-700 dark:text-slate-200 leading-4">{s.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedSuites.length > 0 && <p className="text- text-slate-500 dark:text-slate-400 mt-1">{selectedSuites.length} suite(s) selected</p>}
                </div>

                <div>
                  <span className={labelCls}>TEST CASES (OPTIONAL — EMPTY = ALL)</span>
                  <div className="border border-[#d8dee4] dark:border-[#28374d] rounded bg-white dark:bg-[#101622] max-h-40 overflow-y-auto p-2 space-y-1">
                    {casesForPlan.length === 0 && <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-1">No test cases for this plan.</p>}
                    {casesForPlan.map((c) => (
                      <label key={c.id} className="flex items-start gap-2 px-1 py-1 rounded hover:bg-slate-50 dark:hover:bg-[#1e2a3a] cursor-pointer">
                        <input type="checkbox" checked={selectedCases.includes(c.id)} onChange={() => toggleCase(c.id)} className="mt-0.5 accent-[#48a43f]" />
                        <span className="text-xs text-slate-700 dark:text-slate-200 leading-4">{c.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedCases.length > 0 && <p className="text- text-slate-500 dark:text-slate-400 mt-1">{selectedCases.length} case(s) selected</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="ASSIGNED TO">
                    <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="e.g. Milo Haireche" className={inputCls} />
                  </FormField>
                  <FormField label="CONFIGURATION">
                    <input value={configuration} onChange={(e) => setConfiguration(e.target.value)} placeholder="e.g. Chrome, Windows, Build 1.0.4" className={inputCls} />
                  </FormField>
                </div>

                <FormField label="DESCRIPTION">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this run for?" className={`${inputCls} resize-y`} />
                </FormField>

                <FormActions submitLabel="Create Test Run" saving={saving} savingLabel="Creating..." cancelHref="/test-runs" />
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}