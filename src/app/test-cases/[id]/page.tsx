"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function TestCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [testCase, setTestCase] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [stepToRemove, setStepToRemove] = useState<number | null>(null);
  const [showRemoveStepConfirm, setShowRemoveStepConfirm] = useState(false);
  const [removingStep, setRemovingStep] = useState(false);

  const [form, setForm] = useState({
    title: "",
    project: "QA Studio",
    priority: "medium",
    status: "approved",
    type: "functional",
    category: "Authentication",
    preconditions: "",
    description: "",
    comment: "",
  });
  const [steps, setSteps] = useState<{ action: string; expected: string; status: string }[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [allRequirements, setAllRequirements] = useState<any[]>([]);

  // AUTO_DISMISS_BANNERS - success banners disappear after 4s, no refresh needed
  useEffect(() => { if (!saved) return; const t = setTimeout(() => setSaved(false), 4000); return () => clearTimeout(t); }, [saved]);
  useEffect(() => {
    const projId = (testCase as any)?.project_id ?? (testCase as any)?.project?.id ?? '';
    if (!projId) return;
    fetch(`/api/requirements?projectId=${projId}`, { cache: 'no-store' }).then((r) => r.json()).then((rd) => setAllRequirements(rd.requirements ?? [])).catch(() => {});
  }, [testCase?.project_id, testCase?.project?.id]);

  const commentRef = useRef<HTMLTextAreaElement>(null);
  const autoGrowComment = () => {
    const el = commentRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  useEffect(() => { autoGrowComment(); }, [form.comment, loading]);
  useEffect(() => { fetch('/api/projects', { cache: 'no-store' }).then(r => r.json()).then(j => setProjects(j.projects ?? j.data ?? j ?? [])).catch(() => {}); }, []);
  const load = async () => {
    const res = await fetch(`/api/test-cases/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load test case.");
    const d = data.testCase ?? data.test_case ?? data;
    setTestCase(d);
    setLinkedIds(((data as any).linkedRequirementIds ?? (data as any).requirements?.map((r: any) => String(r.id)) ?? []).map((x: any) => String(x)));
    setForm({
      title: d.title ?? "",
      project: d.project_id ?? d.project?.id ?? d.project ?? "",
      priority: d.priority ?? "medium",
      status: d.status ?? "approved",
      type: d.type ?? d.test_type ?? "functional",
      category: d.category ?? "Authentication",
      preconditions: d.preconditions ?? "",
      description: d.description ?? "",
      comment: d.comment ?? d.comments ?? "",
    });
    const s = data.steps ?? d.steps ?? [];
    setSteps(
      Array.isArray(s)
        ? s.map((x: any) =>
            typeof x === "string"
              ? { action: x, expected: "", status: "not_run" }
              : {
                  action: x.action ?? x.step ?? x.description ?? "",
                  expected: x.expected ?? x.expectedResult ?? x.expected_result ?? x.result ?? "",
                  status: x.status ?? x.result ?? "not_run",
                }
          )
        : []
    );
  };

  useEffect(() => {
    (async () => {
      try { await load(); } catch (e) { setError(e instanceof Error ? e.message : "Could not load test case."); } finally { setLoading(false); }
    })();
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch(`/api/test-cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, project_id: form.project, steps, linkedRequirementIds: linkedIds, requirementIds: linkedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setTestCase(data.testCase ?? data); setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save."); } finally { setSaving(false); }
  };

  const removeTestCase = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/test-cases/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not delete."); setShowDeleteConfirm(false); return; }
      router.push("/test-cases");
    } finally { setDeleting(false); }
  };

  const addStep = () => setSteps((prev) => [...prev, { action: "", expected: "", status: "not_run" }]);
  const updateStep = (i: number, field: "action" | "expected" | "status", v: string) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: v } : s)));
  const confirmRemoveStep = async () => {
    if (stepToRemove === null) return;
    setRemovingStep(true);
    try { setSteps((prev) => prev.filter((_, i) => i !== stepToRemove)); setShowRemoveStepConfirm(false); setStepToRemove(null); } finally { setRemovingStep(false); }
  };

  const caseId = testCase?.case_key ?? testCase?.key ?? testCase?.case_id ?? testCase?.test_case_key ?? "TC-001";

  if (loading)
    return (
      <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
        <Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 p-6 text-xs">Loading...</main></div>
      </div>
    );

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-5">
              <Link href="/test-cases" className="text-xs font-normal text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Test Cases</Link>
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white mb-5">{form.title || "Test Case"}</h1>
            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
            {saved && <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">Saved.</div>}

            {testCase && (
              <form onSubmit={save}>
                <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                  <div className="dark:bg-[#141d28] px-6 py-4 flex justify-between items-start">
                    <div>
                      <span className="inline-flex bg-[#1e2a3d] text-blue-300 text-xs px-2 py-0.5 rounded font-normal">{caseId}</span>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight text-left m-0 mt-2">Test Case Details</h2>
                      <p className="text-xs text-slate-500 mt-1 font-normal">Change any field and click Save Changes. There is no separate Edit button.</p>
                    </div>
                    <button style={{ fontWeight: 400 }} type="button" onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-1 shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-normal text-xs px-3 py-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  </div>

                  <div className="p-6 space-y-5">
                    <div><label className="block text-xs font-normal mb-1.5">Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
                    <div><label className="block text-xs font-normal mb-1.5">Project</label><select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200">{projects.map((p: any) => (<option key={String(p.id)} value={String(p.id)}>{p.key ? `${p.key} — ${p.name}` : p.name}</option>))}</select></div>
                    <div className="grid grid-cols-3 gap-4">
                      <div><label className="block text-xs font-normal mb-1.5">Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select></div>
                      <div><label className="block text-xs font-normal mb-1.5">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200">
  <option value="draft">Draft</option>
  <option value="in_review">In Review</option>
  <option value="ready">Ready</option>
  <option value="approved">Approved</option>
  <option value="archived">Archived</option>
  </select></div>
                      <div><label className="block text-xs font-normal mb-1.5">Type</label><select value={form.type} onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center' })} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200"><option value="functional">Functional</option><option value="regression">Regression</option><option value="smoke">Smoke</option><option value="usability">Usability</option><option value="security">Security</option><option value="performance">Performance</option><option value="integration">Integration</option><option value="ui">UI</option><option value="api">API</option><option value="automation">Automation</option><option value="e2e">E2E</option><option value="uat">UAT</option><option value="system">System</option><option value="exploratory">Exploratory</option></select></div>
                    </div>
                    <div><label className="block text-xs font-normal mb-1.5">Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
                    <div><label className="block text-xs font-normal mb-1.5">Preconditions</label><textarea value={form.preconditions} onChange={(e) => setForm({ ...form, preconditions: e.target.value })} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} rows={2} placeholder="e.g. User account exists, app is on login page" className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf] resize-none overflow-hidden" /></div>
                    <div><label className="block text-xs font-normal mb-1.5">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} rows={3} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf] resize-none overflow-hidden" /></div>

                    <div>
                      <div className="flex items-start gap-2 mb-1"><span className="text-xs text-slate-500 pt-2 w-4 shrink-0"></span><label className="flex-1 block text-xs font-normal px-3">Steps</label><span className="flex-1 text-xs font-normal px-3 whitespace-nowrap">Expected result</span><button type="button" onClick={addStep} className="inline-flex items-center shrink-0 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-normal text-xs px-2.5 py-1 rounded">+ Add Step</button></div>
                      <div className="space-y-2">
                        {steps.map((step, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-xs text-slate-500 pt-2 w-4 shrink-0">{index + 1}.</span>
                            <textarea value={step.action} onChange={(e) => updateStep(index, "action", e.target.value)} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} placeholder="Action" rows={1} className="flex-1 border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf] resize-none overflow-hidden" />
                            <textarea value={step.expected} onChange={(e) => updateStep(index, "expected", e.target.value)} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} placeholder="Expected result" rows={1} className="flex-1 border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf] resize-none overflow-hidden" />
                            <button type="button" onClick={() => { setStepToRemove(index); setShowRemoveStepConfirm(true); }} style={{ fontWeight: 400 }} className="inline-flex items-center justify-center shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-normal text-xs px-3 py-1.5 rounded mt-0.5">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div><label className="block text-xs font-normal mb-1.5">Linked Requirements</label><div className="border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] space-y-1">{allRequirements.length === 0 ? (<p className="text-xs text-slate-500">No requirements in this project.</p>) : (allRequirements.map((req: any) => (<label key={String(req.id)} className="flex items-center gap-2 text-xs font-normal"><input type="checkbox" checked={linkedIds.includes(String(req.id))} onChange={(e) => { const rid = String(req.id); setLinkedIds((prev) => e.target.checked ? [...prev, rid] : prev.filter((x) => x !== rid)); }} className="accent-[#276fbf]" /> {req.req_key} — {req.title}</label>)))}</div></div>

                    <div>
                      <label className="block text-xs font-normal mb-1.5">Comment</label>
                      <textarea
                        ref={commentRef}
                        value={form.comment}
                        onChange={(e) => { setForm({ ...form, comment: e.target.value }); autoGrowComment(); }}
                        onFocus={() => autoGrowComment()}
                        rows={2}
                        placeholder="Add a comment..."
                        style={{ overflow: "hidden", resize: "none" }}
                        className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf]"
                      />
                    </div>
                  </div>
                </div>

                <button disabled={saving} className="mt-6 w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-normal py-2 rounded">{saving ? "Saving..." : "Save Changes"}</button>
              </form>
            )}
          </div>

          <ConfirmDialog open={showRemoveStepConfirm} title="Remove this step?" message="This will remove this step. This cannot be undone." confirmLabel="Remove step" deleting={removingStep} onConfirm={confirmRemoveStep} onCancel={() => { setShowRemoveStepConfirm(false); setStepToRemove(null); }} />
          <ConfirmDialog open={showDeleteConfirm} title="Delete this test case?" message="This will permanently delete this test case. This cannot be undone." confirmLabel="Delete test case" deleting={deleting} onConfirm={removeTestCase} onCancel={() => setShowDeleteConfirm(false)} />
        </main>
      </div>
    </div>
  );
}