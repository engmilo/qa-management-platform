import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
  const { data: r, error } = await supabase.from('releases').select('*, test_plans(id,title,status)').eq('id', params.id).maybeSingle();
  if (error || !r) return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (r as any).organization_id, 'canViewReports'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  return NextResponse.json({ release: r });
}
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const { data: r } = await supabase.from('releases').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!r) return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (r as any).organization_id, 'canEditTestPlan'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const patch: Record<string, unknown> = {};
  if (typeof body.versionName === 'string' && body.versionName.trim()) patch.version_name = body.versionName.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim() || null;
  if (typeof body.status === 'string') patch.status = body.status;
  if (typeof body.startDate === 'string') patch.start_date = body.startDate || null;
  if (typeof body.releaseDate === 'string') patch.release_date = body.releaseDate || null;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const { data: updated, error } = await supabase.from('releases').update(patch).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ release: updated });
}
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: r } = await supabase.from('releases').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!r) return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (r as any).organization_id, 'canEditTestPlan'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { error } = await supabase.from('releases').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}

