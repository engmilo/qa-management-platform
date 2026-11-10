import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Suite not found.' }, { status: 404 });
  const { data: s, error } = await supabase.from('test_suites').select('*').eq('id', params.id).maybeSingle();
  if (error || !s) return NextResponse.json({ error: 'Suite not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (s as any).organization_id, 'canViewReports'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { data: links } = await supabase.from('test_suite_cases').select('test_case_id, test_cases(id,case_key,title,priority,test_type)').eq('test_suite_id', params.id);
  return NextResponse.json({ testSuite: s, cases: (links ?? []).map((l: any) => l.test_cases).filter(Boolean) });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const { data: s } = await supabase.from('test_suites').select('id, organization_id, project_id').eq('id', params.id).maybeSingle();
  if (!s) return NextResponse.json({ error: 'Suite not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (s as any).organization_id, 'canEditTestCase'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim() || null;
  if ('testPlanId' in body) {
    if (body.testPlanId === '' || body.testPlanId === null) {
      patch.test_plan_id = null;
    } else if (typeof body.testPlanId === 'string') {
      const { data: plan } = await supabase.from('test_plans').select('id').eq('id', body.testPlanId).eq('project_id', (s as any).project_id).maybeSingle();
      if (!plan) return NextResponse.json({ error: 'Select a test plan from this project.' }, { status: 400 });
      patch.test_plan_id = plan.id;
    }
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const { data: updated, error } = await supabase.from('test_suites').update(patch).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ testSuite: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: s } = await supabase.from('test_suites').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!s) return NextResponse.json({ error: 'Suite not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (s as any).organization_id, 'canDeleteTestCase'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { error } = await supabase.from('test_suites').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}