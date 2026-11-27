import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError } from '@/lib/auth/require-org-permission';
// Releases = Milestones in TestRail terms.
// GET /api/releases?projectId=
export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const projectId = request.nextUrl.searchParams.get('projectId');
  let q = supabase.from('releases').select('*').order('release_date', { ascending: true });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Could not load milestones.' }, { status: 500 });
  return NextResponse.json({ releases: data ?? [] });
}
// POST /api/releases { projectId, versionName, description?, startDate?, releaseDate?, status? }
export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const versionName = typeof body.versionName === 'string' ? body.versionName.trim() : '';
  if (!projectId || !versionName) return NextResponse.json({ error: 'Project and milestone name are required.' }, { status: 400 });
  const { data: project } = await supabase.from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });
  try { await requireOrgPermission(supabase, user.id, (project as any).organization_id, 'canCreateTestPlan'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { data: rel, error } = await supabase.from('releases').insert({
    project_id: project.id, organization_id: (project as any).organization_id, version_name: versionName,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    start_date: typeof body.startDate === 'string' ? body.startDate || null : null,
    release_date: typeof body.releaseDate === 'string' ? body.releaseDate || null : null,
    status: typeof body.status === 'string' ? body.status : 'planning',
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ release: rel }, { status: 201 });
}

