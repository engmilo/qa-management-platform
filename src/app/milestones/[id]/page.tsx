'use client';
import { Trash2 } from 'lucide-react';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { inputCls, labelCls, FormField, DateField } from '@/components/ui/form-fields';

export default function MilestoneDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [rel, setRel] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ versionName: '', description: '', status: 'planning', startDate: '', releaseDate: '' });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/releases/${id}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load milestone.');
        const release = data.release ?? data;
        setRel(release);
        setForm({
          versionName: release.version_name ?? release.versionName ?? release.name ?? '',
          description: release.description ?? '',
          status: release.status ?? 'planning',
          startDate: release.start_date ? String(release.start_date).slice(0, 10) : '',
          releaseDate: release.release_date ? String(release.release_date).slice(0, 10) : '',
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load milestone.');
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
      // ONLY NEW CHECK: Release must be on/after Start
      if (form.startDate && form.releaseDate) {
        const start = new Date(form.startDate);
        const release = new Date(form.releaseDate);
        if (!isNaN(start.getTime()) && !isNaN(release.getTime()) && release < start) {
          setError('Release Date must be on or after Start Date.');
          return;
        }
      }
      const res = await fetch(`/api/releases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      setRel(data.release ?? data);
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
      const res = await fetch(`/api/releases/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Could not delete.'); setShowDeleteConfirm(false); return; }
      router.push('/milestones');
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
              <Link href="/milestones" className="text-[#276fbf] dark:text-[#4da3ff] hover:underline">← Milestones</Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-500 dark:text-slate-400">{rel?.version_name}</span>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded text-xs">{error}</div>}
            {saved && <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900 rounded text-xs">Saved.</div>}

            {rel && (
              <form onSubmit={save} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md overflow-hidden">
                <div className="px-6 py-4 dark:border-[#28374d] flex justify-between items-start">
                  <div>
                    <h1 className="text-base font-bold text-white tracking-tight text-left m-0">{rel.version_name}</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">Status: {rel.status?.replace('_', ' ')}</p>
                  </div>
                  <button style={{ fontWeight: 400 }} type="button" onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-1 shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-normal text-xs px-3 py-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
                <div className="p-6 space-y-5">
                  <FormField label="VERSION NAME *">
                    <input value={form.versionName} onChange={(e) => setForm({ ...form, versionName: e.target.value })} required className={inputCls} />
                  </FormField>
                  <FormField label="DESCRIPTION">
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputCls} resize-y`} />
                  </FormField>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <span className={labelCls}>STATUS</span>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                        {['planning', 'in_progress', 'released', 'archived'].map((v) => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <DateField label="START DATE" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
                    <DateField label="RELEASE DATE" value={form.releaseDate} onChange={(v) => setForm({ ...form, releaseDate: v })} />
                  </div>
                  <button disabled={saving} className="w-full bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-normal py-2 rounded">{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            )}

            {rel && (
              <section className="mt-6 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-5">
                <h3 className="text-sm font-normal mb-3">Linked Test Plans</h3>
                {rel.test_plans && rel.test_plans.length > 0 ? (
                  <div className="space-y-2">{rel.test_plans.map((p: any) => <div key={p.id} className="flex justify-between text-xs border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2"><Link href={`/test-plans/${p.id}`} className="font-normal text-[#276fbf] dark:text-[#4da3ff] hover:underline">{p.title}</Link><span className="text-slate-500 dark:text-slate-400">{p.status}</span></div>)}</div>
                ) : <p className="text-xs text-slate-400">No test plans linked to this milestone yet. Link one from its Test Plan detail page.</p>}
              </section>
            )}
          </div>
          <ConfirmDialog open={showDeleteConfirm} title="Delete this milestone?" message="This will permanently delete this milestone. Test plans linked to it will lose their milestone link. This cannot be undone." confirmLabel="Delete milestone" deleting={deleting} onConfirm={remove} onCancel={() => setShowDeleteConfirm(false)} />
        </main>
      </div>
    </div>
  );
}