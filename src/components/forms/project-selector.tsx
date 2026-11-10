'use client';

import { useEffect, useState } from 'react';

export type ProjectOption = { id: string; name: string; key: string };

export function ProjectSelector({ value, onChange }: { value: string; onChange: (p: ProjectOption | null) => void }) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' })
      .then(async (r) => { const d = await r.json(); if (r.ok) setProjects(d.projects ?? []); })
      .catch(() => {});
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => {
        const p = projects.find((x) => x.id === e.target.value) ?? null;
        onChange(p);
      }}
      className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#276fbf]"
    >
      <option value="">Select a project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>{p.key} — {p.name}</option>
      ))}
    </select>
  );
}