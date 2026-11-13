import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: tc, error } = await supabase.from('test_cases').select('*').eq('id', params.id).maybeSingle();
  if (error || !tc) return NextResponse.json({ error: 'Test case not found.' }, { status: 404 });
  const { data: links } = await supabase.from('test_case_requirements').select('requirement_id').eq('test_case_id', params.id);
  const { data: steps } = await supabase.from('test_case_steps').select('*').eq('test_case_id', params.id).order('step_number');
  return NextResponse.json({
    testCase: tc,
    steps: steps ?? [],
    linkedRequirementIds: (links ?? []).map((l: any) => String(l.requirement_id)),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const patch: any = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.description === 'string') patch.description = body.description;
  if (typeof body.preconditions === 'string') patch.preconditions = body.preconditions;
  if (typeof body.category === 'string') patch.category = body.category;
  if (typeof body.priority === 'string') patch.priority = body.priority;
  if (typeof body.test_type === 'string') patch.test_type = body.test_type;
  if (typeof body.automation_status === 'string') patch.automation_status = body.automation_status;
  // FIX: Status now has a column in test_cases (Step 1 SQL) — save it
  if (typeof body.status === 'string' && ['draft', 'ready', 'approved', 'deprecated'].includes(body.status)) patch.status = body.status;
  if (typeof body.tags === 'string') patch.tags = body.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (Object.keys(patch).length) {
    const { error } = await supabase.from('test_cases').update(patch).eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (Array.isArray(body.linkedRequirementIds)) {
    await supabase.from('test_case_requirements').delete().eq('test_case_id', params.id);
    const rows = body.linkedRequirementIds.filter(Boolean).map((rid: string) => ({ test_case_id: params.id, requirement_id: rid }));
    if (rows.length) {
      const { error } = await supabase.from('test_case_requirements').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (Array.isArray(body.steps)) {
    await supabase.from('test_case_steps').delete().eq('test_case_id', params.id);
    const stepRows = body.steps.map((s: any, i: number) => ({ test_case_id: params.id, step_number: i + 1, action: s.action ?? '', expected_result: s.expected_result ?? '' }));
    if (stepRows.length) await supabase.from('test_case_steps').insert(stepRows);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await supabase.from('test_case_steps').delete().eq('test_case_id', params.id);
  await supabase.from('test_case_requirements').delete().eq('test_case_id', params.id);
  const { error } = await supabase.from('test_cases').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
