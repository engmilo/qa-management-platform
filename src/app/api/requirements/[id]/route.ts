import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
  const { data, error } = await supabase.from('requirements').select('*, projects(id,name)').eq('id', params.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
  return NextResponse.json({ requirement: data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const { data: existing } = await supabase.from('requirements').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (existing as any).organization_id, 'canCreateTestPlan'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim() || null;
  if (typeof body.priority === 'string') patch.priority = body.priority;
  if (typeof body.status === 'string') patch.status = body.status;
  if (typeof body.type === 'string') patch.type = body.type;
  // FIX1: allow project_id — was missing, so Project could never be saved
  if (typeof body.project_id === 'string' && body.project_id && UUID_RE.test(body.project_id)) patch.project_id = body.project_id;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const { data, error } = await supabase.from('requirements').update(patch).eq('id', params.id).select('*, projects(id,name)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ requirement: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
  const { error } = await supabase.from('requirements').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}
