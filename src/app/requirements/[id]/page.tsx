"use client";
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function RequirementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [req, setReq] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'draft', type: 'functional', project_id: '' });
  const descRef = useRef<HTMLTextAreaElement>(null);
  const autoGrow = () => { const el = descRef.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } };
  useEffect(() => { autoGrow(); }, [form.description, loading]);

  useEffect(() => {
    (async () => {
      try {
        const [res, projRes] = await Promise.all([
          fetch(`/api/requirements/${id}`, { cache: 'no-store' }),
          fetch('/api/projects', { cache: 'no-store' }),
        ]);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load requirement.');
        const projData = await projRes.json().catch(() => ({}));
        setProjects(projData.projects ?? []);
        setReq(data.requirement);
        setForm({
          title: data.requirement.title ?? '',
          description: data.requirement.description ?? '',
          priority: data.requirement.priority ?? 'medium',
          status: data.requirement.status ?? 'draft',
          type: data.requirement.type ?? 'functional',
          project_id: data.requirement.project_id ?? '',
        });
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not load requirement.'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`/api/requirements/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setReq(data.requirement); setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/requirements/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not delete.'); setShowDeleteConfirm(false); return; }
      router.push('/requirements');
    } finally { setDeleting(false); }
  };

  if (loading) return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden"><Header /><main className="flex-1 p-6 text-xs">Loading...</main></div>
    </div>
  );

  const inputCls = "w-full bg-white dark:bg-[#101622] text-slate-900 dark:text-white border border-[#b6c2cf] dark:border-[#28374d] rounded px-3 py-2 text-sm";
  const labelCls = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden"><Header />
        <main className="flex-1 overflow-y-auto p-6"><div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
            <Link href="/requirements" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Requirements</Link>
            <span>/</span><span className="font-medium text-slate-900 dark:text-white">{req?.req_key}</span>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
          {saved && <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">Saved.</div>}
          {req && (
            <form onSubmit={save} className="bg-white dark:bg-[#182232] border border-[#cbd5e1] dark:border-[#28374d] rounded-md shadow-sm dark:shadow-none overflow-hidden">
              <div className="bg-[#f8fafc] dark:bg-[#141d28] px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d] flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs font-normal text-[#276fbf] dark:text-[#4da3ff] bg-[#eef5fc] dark:bg-[#172739] border border-[#d2e3f5] dark:border-[#233f5d] px-2 py-1 rounded">{req.req_key}</span>
                  <h1 className="text-lg font-bold mt-2 text-slate-900 dark:text-white">{req.req_key} — {req.title}</h1>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">This page is already in edit mode — change any field and click Save Changes. There is no separate Edit button.</p>
                </div>
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-600 dark:text-red-400 font-semibold inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </div>
              <div className="p-6 space-y-5">
                <div><label className={labelCls}>Title *</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={inputCls} /></div>
                <div>
                  <label className={labelCls}>Project *</label>
                  <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required className={inputCls}>
                    <option value="">Select project…</option>
                    {projects.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap">Zamir Oy in the header is your organization. Project is the project below it — here it is “QA Management Platform”.</p>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div><label className={labelCls}>Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>{['low','medium','high','critical'].map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
                  <div><label className={labelCls}>Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>{['draft','under_review','approved','implemented','verified','rejected'].map((v) => <option key={v} value={v}>{v.replace('_',' ')}</option>)}</select></div>
                  <div><label className={labelCls}>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>{['functional','non_functional','business','performance','security'].map((v) => <option key={v} value={v}>{v.replace('_',' ')}</option>)}</select></div>
                </div>
                <div><label className={labelCls}>Description</label><textarea ref={descRef} value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); autoGrow(); }} rows={1} style={{ overflow: 'hidden', resize: 'none' }} className={inputCls + ' leading-relaxed'} /></div>
                <button disabled={saving} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          )}
          <ConfirmDialog open={showDeleteConfirm} title="Delete this requirement?" message="This will permanently delete this requirement and unlink it from any test cases. This cannot be undone." confirmLabel="Delete requirement" deleting={deleting} onConfirm={remove} onCancel={() => setShowDeleteConfirm(false)} />
        </div></main></div></div>
  );
}