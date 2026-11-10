import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Test case not found.' }, { status: 404 });
  const { data: tc, error } = await supabase.from('test_cases').select('*').eq('id', params.id).maybeSingle();
  if (error || !tc) return NextResponse.json({ error: 'Test case not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (tc as any).organization_id, 'canViewReports'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const [{ data: steps }, { data: links }] = await Promise.all([
    supabase.from('test_case_steps').select('*').eq('test_case_id', params.id).order('step_number'),
    supabase.from('test_case_requirements').select('requirement_id, requirements(req_key,title)').eq('test_case_id', params.id),
  ]);
  const { data: recent } = await supabase.from('test_executions').select('id,status,executed_at,test_runs(name)').eq('test_case_id', params.id).order('executed_at', { ascending: false }).limit(5);
  return NextResponse.json({ testCase: tc, steps: steps ?? [], requirements: (links ?? []).map((l: any) => ({ id: l.requirement_id, req_key: l.requirements?.req_key, title: l.requirements?.title })), recentExecutions: recent ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Test case not found.' }, { status: 404 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const { data: tc, error } = await supabase.from('test_cases').select('id, organization_id, project_id').eq('id', params.id).maybeSingle();
  if (error || !tc) return NextResponse.json({ error: 'Test case not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (tc as any).organization_id, 'canEditTestCase'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim() || null;
  if (typeof body.preconditions === 'string') patch.preconditions = body.preconditions.trim() || null;
  if (typeof body.priority === 'string') patch.priority = body.priority;
  if (typeof body.testType === 'string') patch.test_type = body.testType;
  if (typeof body.category === 'string') patch.category = body.category.trim() || 'General';
  if (typeof body.automationStatus === 'string') patch.automation_status = body.automationStatus;
  if (typeof body.estimateMinutes === 'number') patch.estimate_minutes = body.estimateMinutes;
  if (Array.isArray(body.tags)) patch.tags = body.tags.filter((t): t is string => typeof t === 'string');
  if (Object.keys(patch).length) {
    const { error: updErr } = await supabase.from('test_cases').update(patch).eq('id', params.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
  }
  // Replace steps if provided: [{ action, expectedResult }]
  if (Array.isArray(body.steps)) {
    await supabase.from('test_case_steps').delete().eq('test_case_id', params.id);
    const steps = (body.steps as any[]).filter((s) => s && (String(s.action ?? '').trim() || String(s.expectedResult ?? '').trim())).map((s, i) => ({ test_case_id: params.id, step_number: i + 1, action: String(s.action ?? '').trim(), expected_result: String(s.expectedResult ?? '').trim() }));
    if (steps.length) { const { error: sErr } = await supabase.from('test_case_steps').insert(steps); if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 }); }
  }
  // Replace requirement links if provided
  if (Array.isArray(body.requirementIds)) {
    const ids = [...new Set((body.requirementIds as unknown[]).filter((x): x is string => typeof x === 'string'))];
    await supabase.from('test_case_requirements').delete().eq('test_case_id', params.id);
    if (ids.length) {
      const { data: reqs } = await supabase.from('requirements').select('id').eq('project_id', (tc as any).project_id).in('id', ids);
      if ((reqs ?? []).length !== ids.length) return NextResponse.json({ error: 'Choose requirements from the same project.' }, { status: 400 });
      const { error: lErr } = await supabase.from('test_case_requirements').insert(ids.map((id) => ({ test_case_id: params.id, requirement_id: id })));
      if (lErr) return NextResponse.json({ error: lErr.message }, { status: 400 });
    }
  }
  const { data: updated } = await supabase.from('test_cases').select('*').eq('id', params.id).single();
  return NextResponse.json({ testCase: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Test case not found.' }, { status: 404 });
  const { data: tc } = await supabase.from('test_cases').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!tc) return NextResponse.json({ error: 'Test case not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (tc as any).organization_id, 'canDeleteTestCase'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { error } = await supabase.from('test_cases').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}

