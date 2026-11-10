import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Test plan not found.' }, { status: 404 });
  const { data: plan, error } = await supabase.from('test_plans').select('*, projects(id,name,key), releases(id,version_name)').eq('id', params.id).maybeSingle();
  if (error || !plan) return NextResponse.json({ error: 'Test plan not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (plan as any).organization_id, 'canViewReports'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const [{ data: runs }, { data: suites }] = await Promise.all([
    supabase.from('test_runs').select('id,name,status,started_at,completed_at').eq('test_plan_id', params.id).order('started_at', { ascending: false }),
    supabase.from('test_suites').select('id,name,description').eq('test_plan_id', params.id).order('sort_order'),
  ]);
  return NextResponse.json({ testPlan: plan, runs: runs ?? [], suites: suites ?? [] });
}
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const { data: plan } = await supabase.from('test_plans').select('id, organization_id, project_id').eq('id', params.id).maybeSingle();
  if (!plan) return NextResponse.json({ error: 'Test plan not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (plan as any).organization_id, 'canEditTestPlan'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.scope === 'string') patch.scope = body.scope.trim() || null;
  if (typeof body.status === 'string') patch.status = body.status;
  if (typeof body.startDate === 'string') patch.start_date = body.startDate || null;
  if (typeof body.endDate === 'string') patch.end_date = body.endDate || null;
  if (typeof body.releaseId === 'string') patch.release_id = body.releaseId || null;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  if (patch.release_id) {
    const { data: rel } = await supabase.from('releases').select('id').eq('id', patch.release_id as string).eq('project_id', (plan as any).project_id).maybeSingle();
    if (!rel) return NextResponse.json({ error: 'Select a milestone from this project.' }, { status: 400 });
  }
  const { data: updated, error } = await supabase.from('test_plans').update(patch).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ testPlan: updated });
}
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: plan } = await supabase.from('test_plans').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!plan) return NextResponse.json({ error: 'Test plan not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (plan as any).organization_id, 'canEditTestPlan'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { error } = await supabase.from('test_plans').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}

