"use client";
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

type Step = { action: string; expected_result: string };
type Req = { id: string; req_key: string; title: string; project_id?: string };

export default function TestCaseDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [pendingRemoveStep, setPendingRemoveStep] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [code, setCode] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    preconditions: '',
    category: '',
    priority: 'medium',
    status: 'draft',
    type: 'functional',
    project_id: '',
    tags: '',
  });
  const [steps, setSteps] = useState<Step[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [allRequirements, setAllRequirements] = useState<Req[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);

  const descRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLTextAreaElement>(null);
  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };
  useEffect(() => { autoGrow(descRef.current); }, [form.description, loading]);
  const growStep = (el: HTMLTextAreaElement | null) => { if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };
  useEffect(() => { document.querySelectorAll<HTMLTextAreaElement>('textarea[data-step]').forEach((el) => growStep(el)); }, [steps, loading]);
  useEffect(() => { autoGrow(preRef.current); }, [form.preconditions, loading]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [tcRes, reqRes, projRes] = await Promise.all([
          fetch(`/api/test-cases/${id}`, { cache: 'no-store' }),
          fetch('/api/requirements', { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
        ]);
        const tcData = await tcRes.json().catch(() => ({}));
        const reqData = await reqRes.json().catch(() => ({}));
        const projData = await projRes.json().catch(() => ({}));

        const tc = tcData.testCase ?? tcData ?? {};
        setCode(tc.code ?? tc.test_case_code ?? '');
        setForm({
          title: tc.title ?? '',
          description: tc.description ?? '',
          preconditions: tc.preconditions ?? '',
          category: tc.category ?? '',
          priority: tc.priority ?? 'medium',
          status: tc.status ?? 'draft',
          type: tc.test_type ?? tc.type ?? 'functional',
          project_id: tc.project_id ? String(tc.project_id) : '',
          tags: Array.isArray(tc.tags) ? tc.tags.join(', ') : (tc.tags ?? ''),
        });
        setSteps(Array.isArray(tcData.steps) ? tcData.steps : (Array.isArray(tc.steps) ? tc.steps : []));
        // FIX: linked IDs come from join table via API, not from a column
        setLinkedIds((tcData.linkedRequirementIds ?? tc.linkedRequirementIds ?? []).map((x: any) => String(x)));
        // FIX: ALL requirements, no project_id filter — that filter returned 0
        setAllRequirements(reqData.requirements ?? reqData ?? []);
        setProjects(projData.projects ?? projData ?? []);
        setExecutions(tcData.executions ?? tcData.recentExecutions ?? []);
      } catch {
        setAllRequirements([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const inputCls = 'w-full text-xs font-normal bg-white dark:bg-[#101622] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-2';
  const labelCls = 'block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300';

  const save = async () => {
    if (!form.title.trim()) { setSavedMsg('Title is required.'); return; }
    setSaving(true);
    setSavedMsg('');
    try {
      const res = await fetch(`/api/test-cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          preconditions: form.preconditions,
          category: form.category,
          priority: form.priority,
          status: form.status,
          test_type: form.type,
          project_id: form.project_id || null,
          tags: form.tags,
          steps: steps,
          // FIX: persist link to join table
          linkedRequirementIds: linkedIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSavedMsg('Saved.');
    } catch (e: any) {
      const msg = String(e.message || 'Save failed.');
      if (msg.includes('row-level security') || msg.includes('test_case_requirements')) {
        setSavedMsg('Save blocked by database permissions (RLS) on test_case_requirements. Run the SQL fix in Supabase > SQL Editor, then try Save again.');
      } else {
        setSavedMsg(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/test-cases/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      window.location.href = '/test-cases';
    } catch {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="w-full max-w-none">
              <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-4 text-center text-xs font-semibold text-slate-500">Loading test case...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="max-w-3xl mx-auto">
              <Link href="/test-cases" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">← Test Cases</Link>
              <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md overflow-hidden mt-3">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700/50 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {code && <span className="inline-block px-2 py-0.5 rounded text-xs font-normal bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{code}</span>}
                    <h1 className="mt-2 dark:text-white text-base font-bold text-slate-900 tracking-tight">{code ? `${code} — ` : ''}{form.title || 'Test Case'}</h1>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Change any field and click Save Changes. There is no separate Edit button.</p>
                  </div>
                  <button onClick={() => setShowDelete(true)} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline shrink-0">Delete</button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className={labelCls}>Title *</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Project</label>
                    <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className={inputCls}>
                      <option value="">Select project</option>
                      {projects.map((p: any) => (<option key={p.id} value={String(p.id)}>{p.name}</option>))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Priority</label>
                      <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                        <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                        <option value="draft">draft</option><option value="ready">ready</option><option value="approved">approved</option><option value="deprecated">deprecated</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Type</label>
                      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                        <option value="functional">functional</option><option value="regression">regression</option><option value="smoke">smoke</option><option value="security">security</option><option value="performance">performance</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Category</label>
                    <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Authentication" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Preconditions</label>
                    <textarea ref={preRef} value={form.preconditions} onChange={(e) => { setForm({ ...form, preconditions: e.target.value }); autoGrow(preRef.current); }} rows={1} style={{ overflow: 'hidden', resize: 'none' }} className={inputCls + ' leading-relaxed'} />
                  </div>

                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea ref={descRef} value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); autoGrow(descRef.current); }} rows={1} style={{ overflow: 'hidden', resize: 'none' }} className={inputCls + ' leading-relaxed'} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className={labelCls}>Steps (structured — replaces free-text steps)</label>
                      <button onClick={() => setSteps([...steps, { action: '', expected_result: '' }])} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">+ Add Step</button>
                    </div>
                    <div className="space-y-2">
                      {steps.map((s, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className="text-xs font-semibold pt-2 w-5 shrink-0">{i + 1}.</span>
                          <textarea data-step value={s.action} onChange={(e) => { const n = [...steps]; n[i] = { ...n[i], action: e.target.value }; setSteps(n); growStep(e.target); }} onFocus={(e) => growStep(e.target)} placeholder="Action" rows={1} style={{ overflow: 'hidden', resize: 'none' }} className={inputCls + ' leading-relaxed'} />
                          <textarea data-step value={s.expected_result} onChange={(e) => { const n = [...steps]; n[i] = { ...n[i], expected_result: e.target.value }; setSteps(n); growStep(e.target); }} onFocus={(e) => growStep(e.target)} placeholder="Expected result" rows={1} style={{ overflow: 'hidden', resize: 'none' }} className={inputCls + ' leading-relaxed'} />
                          <button onClick={() => setPendingRemoveStep(i)} className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline pt-2 shrink-0">Remove</button>
                        </div>
                      ))}
                      {steps.length === 0 && <p className="text-xs font-semibold text-slate-500">No steps yet. Click + Add Step.</p>}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Linked Requirements</label>
                    <div className="border border-[#b6c2cf] dark:border-[#28374d] rounded font-normal px-3 py-2 space-y-1.5 bg-white dark:bg-[#101622]">
                      {allRequirements.length === 0 && (
                        <p className="text-xs font-semibold text-slate-500">No requirements found. Create one in Requirements first.</p>
                      )}
                      {allRequirements.map((r) => (
                        <label key={r.id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={linkedIds.includes(String(r.id))}
                            onChange={(e) => {
                              const rid = String(r.id);
                              setLinkedIds((prev) => e.target.checked ? [...prev, rid] : prev.filter((x) => x !== rid));
                            }}
                          />
                          <span>{r.req_key} — {r.title}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Ticked requirements are saved to test_case_requirements and show in Traceability.</p>
                  </div>

                  <div>
                    <label className={labelCls}>Tags (comma-separated)</label>
                    <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="login, smoke" className={inputCls} />
                  </div>

                  {savedMsg && <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{savedMsg}</p>}

                  <button onClick={save} disabled={saving} className="w-full text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded px-3 py-2.5">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] shadow-sm dark:shadow-none rounded-md p-5 mt-4">
                <h2 className="text-xs font-semibold text-slate-900 dark:text-white mb-3">Recent Executions</h2>
                {executions.length === 0 && <p className="text-xs font-semibold text-slate-500">No executions yet.</p>}
                {executions.map((ex: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs font-semibold py-2 border-t border-slate-100 dark:border-slate-700/50 first:border-t-0">
                    <span>{ex.run_name ?? ex.name ?? `Run ${i + 1}`}</span>
                    <span className="text-slate-500">{ex.status ?? ex.result ?? ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {pendingRemoveStep !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] rounded-md p-5 w-full max-w-sm">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Remove this step?</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Step {pendingRemoveStep + 1}: {steps[pendingRemoveStep]?.action || ''} — this will remove it from the list. Click Save Changes to persist.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setPendingRemoveStep(null)} className="flex-1 text-xs font-semibold border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-2">Cancel</button>
              <button onClick={() => { setSteps(steps.filter((_, j) => j !== pendingRemoveStep)); setPendingRemoveStep(null); }} className="flex-1 text-xs font-semibold bg-red-600 text-white rounded px-3 py-2">Remove</button>
            </div>
          </div>
        </div>
      )}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] rounded-md p-5 w-full max-w-sm">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Delete test case?</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">This cannot be undone.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowDelete(false)} className="flex-1 text-xs font-semibold border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-2">Cancel</button>
              <button onClick={doDelete} disabled={deleting} className="flex-1 text-xs font-semibold bg-red-600 text-white rounded px-3 py-2 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}