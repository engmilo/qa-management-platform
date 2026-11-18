import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

// FIX: The live UI posts to /api/milestones with { project, name, status: "Planned", dueDate }
// but the real Supabase table is called `releases` (not `milestones`) and its
// columns are version_name / status: planning / release_date.
// The old route tried to insert into `milestones` -> 500 "Could not create milestone."
// This route accepts BOTH shapes and writes to `releases`, and returns the REAL error.

function mapStatus(input: unknown): string {
  const s = String(input ?? 'planning').trim().toLowerCase();
  if (s === 'planned' || s === 'planning') return 'planning';
  if (s === 'in progress' || s === 'in_progress' || s === 'in-progress') return 'in_progress';
  if (s === 'released') return 'released';
  if (s === 'archived') return 'archived';
  return s || 'planning';
}

function cleanDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t;
}

export async function GET(req: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId') || searchParams.get('project_id');

  let q = supabase.from('releases').select('*, projects(id,name,key)').order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) {
    console.error('[GET /api/milestones] Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Return both keys so old and new pages work
  return NextResponse.json({ milestones: data ?? [], releases: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  // Accept every variant the UI has ever sent
  const projectId = (body.projectId as string) || (body.project_id as string) || (body.project as string) || '';
  const versionName =
    (body.versionName as string) ||
    (body.version_name as string) ||
    (body.name as string) ||
    (body.title as string) ||
    '';
  const description = typeof body.description === 'string' ? body.description.trim() || null : null;
  const status = mapStatus(body.status);
  const releaseDate = cleanDate(body.releaseDate ?? body.release_date ?? body.dueDate ?? body.due_date);
  const startDate = cleanDate(body.startDate ?? body.start_date);

  if (!projectId) return NextResponse.json({ error: 'Project is required.' }, { status: 400 });
  if (!versionName.trim()) return NextResponse.json({ error: 'Name / Version Name is required.' }, { status: 400 });

  // organization_id is NOT NULL in releases table — get it from the project
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id, organization_id')
    .eq('id', projectId)
    .maybeSingle();

  if (projErr || !project) {
    console.error('[POST /api/milestones] Project lookup failed:', projErr);
    return NextResponse.json({ error: 'Project not found. Please re-select the project.' }, { status: 400 });
  }

  const insertRow = {
    project_id: projectId,
    organization_id: (project as any).organization_id,
    version_name: versionName.trim(),
    description,
    status,
    start_date: startDate,
    release_date: releaseDate,
  };

  console.log('[POST /api/milestones] Inserting:', insertRow);

  const { data, error } = await supabase.from('releases').insert(insertRow).select('*').single();

  if (error) {
    // RETURN THE REAL ERROR, not a generic message — this is the P0 fix
    console.error('[POST /api/milestones] Supabase insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ milestone: data, release: data }, { status: 201 });
}
