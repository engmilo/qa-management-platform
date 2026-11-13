'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ArrowLeft, Calendar } from 'lucide-react';

type Project = { id: string; name: string; key: string };

export default function NewMilestonePage() {
  const router = useRouter();
  const dateRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({ project_id: '', name: '', description: '', status: 'planned', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/projects', { cache: 'no-store' });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (res.ok) {
          setProjects(data.projects ?? []);
          if (data.projects?.[0]) setForm((f) => ({ ...f, project_id: data.projects[0].id }));
        }
      } catch { /* keep empty */ }
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/milestones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || 'Could not create milestone.');
      router.push('/milestones');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create milestone.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
              <Link href="/milestones" className="text-[#276fbf] hover:underline flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Milestones</Link>
              <span>/</span><span>New</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight text-left m-0 mb-1">New Milestone</h1>
            <p className="text-xs text-slate-500 mb-5 font-normal">Create a milestone for a project.</p>
            {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">{error}</div>}
            <form onSubmit={save} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-6 space-y-5 max-w-3xl">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Project *</label>
                <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] rounded px-3 py-2 text-xs font-normal">
                  <option value="">Select project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.key} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Beta Release" className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded font-normal px-3 py-2 text-sm" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] rounded px-3 py-2 text-xs font-normal">
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Due Date</label>
                  <div className="relative">
                    <input
                      ref={dateRef}
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                      style={{ colorScheme: 'dark' }}
                      className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded pl-3 pr-10 py-2 text-sm cursor-pointer [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <button
                      type="button"
                      aria-label="Open calendar"
                      onClick={() => dateRef.current?.showPicker?.()}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white dark:text-slate-300 dark:hover:text-white p-0.5"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded font-normal px-3 py-2 text-sm" />
              </div>
              <button disabled={saving} className="w-full bg-[#276fbf] hover:bg-[#1e5a9e] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded">{saving ? 'Creating...' : 'Create Milestone'}</button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}