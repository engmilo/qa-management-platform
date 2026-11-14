"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function DefectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [defect, setDefect] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stepToRemove, setStepToRemove] = useState<number | null>(null);
  const [showRemoveStepConfirm, setShowRemoveStepConfirm] = useState(false);
  const [removingStep, setRemovingStep] = useState(false);

  const [form, setForm] = useState({
    summary: "",
    severity: "major",
    priority: "medium",
    status: "fixed",
    environment: "Test",
    description: "",
    expectedResult: "",
    actualResult: "",
  });
  const [steps, setSteps] = useState<string[]>([]);

  const load = async () => {
    const res = await fetch(`/api/defects/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load defect.");
    const d = data.defect ?? data;
    setDefect(d);
    setForm({
      summary: d.summary ?? d.title ?? "",
      severity: d.severity ?? "major",
      priority: d.priority ?? "medium",
      status: d.status ?? "fixed",
      environment: d.environment ?? "Test",
      description: d.description ?? "",
      expectedResult: d.expectedResult ?? d.expected_result ?? "",
      actualResult: d.actualResult ?? d.actual_result ?? "",
    });
    const s = d.steps ?? d.stepsToReproduce ?? d.steps_to_reproduce ?? [];
    setSteps(Array.isArray(s) ? s.map((x: any) => (typeof x === "string" ? x : x.action ?? x.description ?? x.step ?? "")) : []);
  };

  useEffect(() => {
    (async () => {
      try { await load(); } catch (e) { setError(e instanceof Error ? e.message : "Could not load defect."); } finally { setLoading(false); }
    })();
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch(`/api/defects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, steps }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setDefect(data.defect ?? data); setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save."); } finally { setSaving(false); }
  };

  const removeDefect = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/defects/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not delete."); setShowDeleteConfirm(false); return; }
      router.push("/defects");
    } finally { setDeleting(false); }
  };

  const addStep = () => setSteps((prev) => [...prev, ""]);
  const updateStep = (index: number, value: string) => setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  const confirmRemoveStep = async () => {
    if (stepToRemove === null) return;
    setRemovingStep(true);
    try { setSteps((prev) => prev.filter((_, i) => i !== stepToRemove)); setShowRemoveStepConfirm(false); setStepToRemove(null); } finally { setRemovingStep(false); }
  };

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
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <Link href="/defects" className="text-[#276fbf] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Defects</Link>
              <span>/</span><span className="font-normal">{defect?.key ?? defect?.defect_key ?? "ZAM-1"}</span>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
                        {saved && <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">Saved.</div>}

            {defect && (
              <form onSubmit={save} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                <div className="dark:bg-[#141d28] px-6 py-4 flex justify-between items-start">
                  <div>
                    <span className="inline-flex bg-[#1e2a3d] text-blue-300 text-xs px-2 py-0.5 rounded font-normal">{defect?.key ?? defect?.defect_key ?? "ZAM-1"}</span>
                    <h1 className="text-base font-bold text-white tracking-tight text-left m-0 mt-2">{form.summary || defect?.title || "Defect"}</h1>
                    <p className="text-xs text-slate-500 mt-1 font-normal">Created {defect?.created_at ? new Date(defect.created_at).toLocaleString() : ""}</p>
                  </div>
                  <button style={{ fontWeight: 400 }} type="button" onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-1 shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-normal text-xs px-3 py-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>

                <div className="p-6 space-y-5">
                  <div><label className="block text-xs font-normal mb-1.5">Summary *</label><input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} required className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-xs font-normal mb-1.5">Severity</label><select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200"><option value="critical">critical</option><option value="major">major</option><option value="minor">minor</option><option value="trivial">trivial</option></select></div>
                    <div><label className="block text-xs font-normal mb-1.5">Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option></select></div>
                    <div><label className="block text-xs font-normal mb-1.5">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200"><option value="open">open</option><option value="in_progress">in_progress</option><option value="fixed">fixed</option><option value="ready_for_retest">ready_for_retest</option><option value="closed">closed</option></select></div>
                  </div>
                  <div><label className="block text-xs font-normal mb-1.5">Environment</label><input value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" /></div>
                  <div><label className="block text-xs font-normal mb-1.5">Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf] resize-none overflow-hidden" /></div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-normal">STEPS TO REPRODUCE</label>
                      <button type="button" onClick={addStep} className="inline-flex items-center bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-normal text-xs px-2.5 py-1 rounded">+ Add Step</button>
                    </div>
                    <div className="space-y-2">
                      {steps.length === 0 ? <p className="text-xs text-slate-400">No steps yet. Click + Add Step.</p> : steps.map((step, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-xs text-slate-500 pt-2 w-4 shrink-0">{index + 1}.</span>
                          <input value={step} onChange={(e) => updateStep(index, e.target.value)} className="flex-1 border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf]" />
                          {/* Remove - NO bin icon, text only, still red + confirmation */}
                          <button
                            type="button"
                            onClick={() => { setStepToRemove(index); setShowRemoveStepConfirm(true); }}
                            style={{ fontWeight: 400 }}
                            className="inline-flex items-center justify-center shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-normal text-xs px-3 py-1.5 rounded mt-0.5"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-normal mb-1.5">Expected Result</label><textarea value={form.expectedResult} onChange={(e) => setForm({ ...form, expectedResult: e.target.value })} rows={3} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf] resize-none overflow-hidden" /></div>
                    <div><label className="block text-xs font-normal mb-1.5">Actual Result</label><textarea value={form.actualResult} onChange={(e) => setForm({ ...form, actualResult: e.target.value })} rows={3} className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf] resize-none overflow-hidden" /></div>
                  </div>
                  <button disabled={saving} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-normal py-2 rounded">{saving ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            )}
          </div>

          <ConfirmDialog open={showRemoveStepConfirm} title="Remove this step?" message="This will remove this step from Steps to Reproduce. This cannot be undone." confirmLabel="Remove step" deleting={removingStep} onConfirm={confirmRemoveStep} onCancel={() => { setShowRemoveStepConfirm(false); setStepToRemove(null); }} />
          <ConfirmDialog open={showDeleteConfirm} title="Delete this defect?" message="This will permanently delete this defect. This cannot be undone." confirmLabel="Delete defect" deleting={deleting} onConfirm={removeDefect} onCancel={() => setShowDeleteConfirm(false)} />
        </main>
      </div>
    </div>
  );
}