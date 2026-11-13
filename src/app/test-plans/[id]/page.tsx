'use client';
import { Trash2 } from 'lucide-react';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { inputCls, labelCls, FormField, DateField } from '@/components/ui/form-fields';

export default function TestPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [suites, setSuites] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', scope: '', status: 'active', startDate: '', endDate: '', releaseId: '' });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/test-plans/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load plan.');
        setPlan(data.testPlan);
        setRuns(data.runs ?? []);
        setSuites(data.suites ?? []);
        setForm({
          title: data.testPlan.title ?? data.testPlan.name ?? '',
          scope: data.testPlan.scope ?? data.testPlan.description ?? '',
          status: data.testPlan.status ?? 'active',
          startDate: data.testPlan.start_date ? String(data.testPlan.start_date).slice(0, 10) : '',
          endDate: data.testPlan.end_date ? String(data.testPlan.end_date).slice(0, 10) : '',
          releaseId: data.testPlan.release_id ?? data.testPlan.milestone_id ?? '',
        });
        const mr = await fetch(`/api/releases?projectId=${data.testPlan.project_id}`, { cache: 'no-store' });
        const md = await mr.json().catch(() => ({}));
        if (mr.ok) {
          const list = Array.isArray(md) ? md : md.releases ?? md.data ?? [];
          setMilestones(list);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load plan.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      // ONLY NEW CHECK: End must be on/after Start
      if (form.startDate && form.endDate) {
        const start = new Date(form.startDate);
        const end = new Date(form.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
          setError('End Date must be on or after Start Date.');
          return;
        }
      }
      const res = await fetch(`/api/test-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setPlan(data.testPlan);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/test-plans/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not delete.'); setShowDeleteConfirm(false); return; }
      router.push('/test-plans');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622]"><Sidebar /><div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="p-6 text-xs">Loading...</main></div></div>;

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 text-xs mb-4">
              <Link href="/test-plans" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Test Plans</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">{plan?.title}</span>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
            {saved && <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">Saved.</div>}

            {plan && (
              <>
                <form onSubmit={save} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden mb-6">
                  <div className="px-6 py-4 dark:border-[#28374d] flex justify-between items-start">
                    <div>
                      <h1 className="text-base font-bold text-white tracking-tight text-left m-0">{plan.title}</h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">{plan.projects?.key} — {plan.projects?.name}{plan.releases ? ` · Milestone: ${plan.releases.version_name}` : ''}</p>
                    </div>
                    <button style={{ fontWeight: 400 }} type="button" onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-1 shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-normal text-xs px-3 py-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                  </div>
                  <div className="p-6 space-y-4">
                    <FormField label="TITLE *">
                      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputCls} />
                    </FormField>
                    <FormField label="SCOPE">
                      <textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} rows={3} className={`${inputCls} resize-none overflow-hidden`} onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }} ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} />
                    </FormField>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <span className={labelCls}>STATUS</span>
                        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                          {['active', 'draft', 'planning', 'in_progress', 'completed', 'archived'].map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      {/* FIXED: use DateField so calendar icon shows and picker opens */}
                      <DateField label="START" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
                      <DateField label="END" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
                    </div>
                    <div>
                      <span className={labelCls}>MILESTONE (RELEASE)</span>
                      <select value={form.releaseId} onChange={(e) => setForm({ ...form, releaseId: e.target.value })} className={inputCls}>
                        <option value="">No milestone</option>
                        {milestones.map((m: any) => <option key={m.id} value={m.id}>{m.version_name ?? m.name} — {m.status}</option>)}
                      </select>
                    </div>
                    <button disabled={saving} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-normal py-2 rounded">{saving ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                </form>

                <section className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-normal">Test Runs in this Plan</h3>
                    <Link href={`/test-runs/new?projectId=${plan.project_id}&testPlanId=${plan.id}`} className="bg-[#48a43f] text-white text-xs font-normal px-3 py-1.5 rounded">Create Run from Plan</Link>
                  </div>
                  {runs.length === 0 ? <p className="text-xs text-slate-400">No runs yet.</p> : runs.map((r: any) => <Link key={r.id} href={`/test-runs/${r.id}`} className="flex justify-between py-2 border-b last:border-0 text-xs hover:bg-slate-50 dark:hover:bg-[#1e2a3a] px-2 rounded"><span className="font-normal">{r.name}</span><span>{r.status}</span></Link>)}
                </section>

                <section className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5">
                  <h3 className="text-sm font-normal mb-2">Suites in this Plan</h3>
                  {suites.length === 0 ? <p className="text-xs text-slate-400">No suites linked to this plan.</p> : suites.map((s: any) => <Link key={s.id} href={`/test-suites/${s.id}`} className="block py-1.5 text-xs border-b last:border-0 hover:bg-slate-50 dark:hover:bg-[#1e2a3a] px-2 rounded"><span className="font-normal text-[#276fbf] dark:text-[#4da3ff] hover:underline">{s.name}</span></Link>)}
                </section>
              </>
            )}
          </div>
          <ConfirmDialog open={showDeleteConfirm} title="Delete this test plan?" message="Runs are kept, but will lose their plan link. This cannot be undone." confirmLabel="Delete test plan" deleting={deleting} onConfirm={remove} onCancel={() => setShowDeleteConfirm(false)} />
        </main>
      </div>
    </div>
  );
}