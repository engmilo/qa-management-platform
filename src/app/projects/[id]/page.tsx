'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { FolderKanban, ArrowLeft, CheckSquare, PlayCircle, Plus } from 'lucide-react';

type Project = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetch(`/api/projects/${encodeURIComponent(projectId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load this project.');
        return result.project as Project;
      })
      .then((result) => { if (active) setProject(result); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load this project.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [projectId]);

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Link href="/projects" className="text-[#276fbf] hover:underline flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Projects
                </Link>
                <span>/</span>
                <span className="text-slate-800 font-semibold">{project?.name || 'Project Details'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/projects" className="btn-testrail-secondary text-xs">
                  Back to Projects
                </Link>
                <Link href="/projects/new" className="btn-testrail-primary text-xs">
                  <Plus className="w-3.5 h-3.5" /> New Project
                </Link>
              </div>
            </div>

            {error ? (
              <section role="alert" className="bg-white border border-red-200 rounded-md p-6 shadow-sm">
                <p className="text-sm font-semibold text-red-600">{error}</p>
                <p className="mt-1 text-xs text-slate-500">The project may have been removed or may belong to an organization you cannot access.</p>
              </section>
            ) : project ? (
              <div className="space-y-6">
                {/* Main Project Overview Card */}
                <section className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm overflow-hidden">
                  <div className="bg-[#f8fafc] dark:bg-[#141d28] px-6 py-4 border-b border-[#e2e8f0] dark:border-[#28374d] border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#276fbf] bg-[#eef5fc] border border-[#d2e3f5] px-2.5 py-1 rounded">
                        {project.key}
                      </span>
                      <h1 className="text-lg font-bold text-slate-900 tracking-tight">{project.name}</h1>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                        project.status === 'active'
                          ? 'bg-[#dff0d8] text-[#3c763d] border border-[#d6e9c6]'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <div className="p-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description / Scope</h4>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {project.description || 'No project description provided.'}
                    </p>

                    {/* TestRail Quick Actions Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#edf2f7]">
                      <Link
                        href="/test-cases"
                        className="p-4 rounded border border-[#d8dee4] hover:border-[#276fbf] hover:bg-[#f0f7ff]/40 transition-all flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded bg-[#eef5fc] text-[#276fbf] flex items-center justify-center shrink-0">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Test Cases Repository</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Browse, write, and organize test suites</p>
                        </div>
                      </Link>

                      <Link
                        href="/test-runs"
                        className="p-4 rounded border border-[#d8dee4] hover:border-[#48a43f] hover:bg-[#f3f9f2]/40 transition-all flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded bg-[#e8f5e9] text-[#48a43f] flex items-center justify-center shrink-0">
                          <PlayCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Test Runs & Execution</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Execute suites and record test results</p>
                        </div>
                      </Link>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#edf2f7] flex items-center justify-between text-[11px] text-slate-400">
                      <span>Created on {new Date(project.created_at).toLocaleDateString()}</span>
                      <span>ID: {project.id}</span>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
