import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get('projectId');
  let query = supabase.from('test_cases').select('*').order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load test cases.' }, { status: 500 });
  return NextResponse.json({ testCases: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId : typeof body.project_id === 'string' ? body.project_id : '';
  const caseKey = typeof body.caseKey === 'string' ? body.caseKey.trim().toUpperCase() : typeof body.case_key === 'string' ? body.case_key.trim().toUpperCase() : typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const rawRequirementIds = Array.isArray(body.requirementIds) ? body.requirementIds : Array.isArray(body.requirement_ids) ? body.requirement_ids : [];
  const testType = typeof body.testType === 'string' ? body.testType : typeof body.type === 'string' ? body.type : 'functional';
  const status = typeof body.status === 'string' ? body.status : 'draft';
  const stepsInput = Array.isArray(body.steps) ? body.steps : [];
  const requirementIds = [...new Set(rawRequirementIds.filter((id): id is string => typeof id === 'string'))];
  if (!projectId || !caseKey || !title) {
    return NextResponse.json({ error: 'Project, test case key, and title are required.' }, { status: 400 });
  }
  if (rawRequirementIds.some((id) => typeof id !== 'string') || requirementIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    return NextResponse.json({ error: 'One or more linked requirements are invalid.' }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });

  if (requirementIds.length) {
    const { data: requirements, error: requirementsError } = await supabase
      .from('requirements')
      .select('id')
      .eq('project_id', project.id)
      .in('id', requirementIds);
    if (requirementsError || requirements?.length !== requirementIds.length) {
      return NextResponse.json({ error: 'Choose requirements from the selected project.' }, { status: 400 });
    }
  }

  const { data: testCase, error } = await supabase.from('test_cases').insert({
    project_id: project.id,
    organization_id: project.organization_id,
    case_key: caseKey,
    title,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    preconditions: typeof body.preconditions === 'string' ? body.preconditions.trim() || null : null,
    priority: typeof body.priority === 'string' ? body.priority : 'medium',
    test_type: testType,
    status,
    category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'General',
    automation_status: typeof body.automationStatus === 'string' ? body.automationStatus : 'manual',
    author_id: user.id,
  }).select().single();

  if (error) {
    return NextResponse.json(
      { error: error.code === '23505' ? 'That test case key is already used in this project.' : error.message },
      { status: error.code === '23505' ? 409 : 400 }
    );
  }

  if (requirementIds.length) {
    const { error: linkError } = await supabase.from('test_case_requirements').insert(
      requirementIds.map((requirementId) => ({ test_case_id: testCase.id, requirement_id: requirementId }))
    );
    if (linkError) {
      await supabase.from('test_cases').delete().eq('id', testCase.id);
      return NextResponse.json({ error: 'Could not link the selected requirements to this test case.' }, { status: 400 });
    }
  }

  if (stepsInput.length) {
    const stepRows = stepsInput.map((s: any, i: number) => ({ test_case_id: testCase.id, step_number: i + 1, action: s.action ?? '', expected_result: s.expected_result ?? '' }));
    const { error: stepsError } = await supabase.from('test_case_steps').insert(stepRows);
    if (stepsError) {
      // don't fail the whole create if steps table is missing - test case itself is saved
      console.error('Could not save test case steps:', stepsError.message);
    }
  }

  return NextResponse.json({ testCase }, { status: 201 });
}
