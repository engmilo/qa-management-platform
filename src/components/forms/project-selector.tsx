'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type ProjectOption = {
  id: string;
  organization_id: string;
  key: string;
  name: string;
};

export function ProjectSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (project: ProjectOption | null) => void;
  disabled?: boolean;
}) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    fetch('/api/projects', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load projects.');
        return (data.projects ?? []) as ProjectOption[];
      })
      .then((items) => {
        if (!active) return;
        setProjects(items);
        if (items.length > 0) onChange(items.find((item) => item.id === value) ?? items[0]);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load projects.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  // This runs once so a parent state update does not refetch the same options.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-xs text-[#6e7d8c]">Loading projects...</p>;
  if (error) return <p role="alert" className="text-xs text-red-600">{error}</p>;
  if (projects.length === 0) {
    return (
      <div className="text-xs text-[#6e7d8c]">
        No active projects found. <Link href="/projects/new" className="text-[#276fbf] hover:underline font-semibold">Create a project first</Link>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(event) => onChange(projects.find((project) => project.id === event.target.value) ?? null)}
      className="w-full px-3 py-2 bg-white border border-[#d8dee4] rounded text-sm text-[#1d2d3e] focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] transition"
      required
      disabled={disabled}
    >
      <option value="" disabled>Select a project</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>{project.key} — {project.name}</option>
      ))}
    </select>
  );
}
