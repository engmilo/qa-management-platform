import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
  const { data: r, error } = await supabase.from('requirements').select('*').eq('id', params.id).maybeSingle();
  if (error || !r) return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (r as any).organization_id, 'canViewReports'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  return NextResponse.json({ requirement: r });
}
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const { data: r } = await supabase.from('requirements').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!r) return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (r as any).organization_id, 'canEditRequirement'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim() || null;
  if (typeof body.priority === 'string') patch.priority = body.priority;
  if (typeof body.status === 'string') patch.status = body.status;
  if (typeof body.type === 'string') patch.type = body.type;
  if (typeof body.ownerId === 'string') patch.owner_id = body.ownerId || null;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const { data: updated, error } = await supabase.from('requirements').update(patch).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ requirement: updated });
}
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: r } = await supabase.from('requirements').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!r) return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (r as any).organization_id, 'canDeleteRequirement'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { error } = await supabase.from('requirements').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}

