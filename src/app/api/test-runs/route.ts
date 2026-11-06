import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get('projectId');
  let query = supabase.from('test_runs').select('*').order('started_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load test runs.' }, { status: 500 });
  return NextResponse.json({ testRuns: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!projectId || !name) {
    return NextResponse.json({ error: 'Project and test run name are required.' }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });

  let testPlanId: string | null = null;
  if (typeof body.testPlanId === 'string' && body.testPlanId) {
    const { data: plan } = await supabase.from('test_plans').select('id')
      .eq('id', body.testPlanId).eq('project_id', project.id).maybeSingle();
    if (!plan) return NextResponse.json({ error: 'Select a test plan from this project.' }, { status: 400 });
    testPlanId = plan.id;
  }

  const { data: run, error: runError } = await supabase.from('test_runs').insert({
    project_id: project.id,
    organization_id: project.organization_id,
    name,
    test_plan_id: testPlanId,
    assigned_to: user.id,
    status: 'in_progress',
  }).select().single();

  if (runError || !run) {
    return NextResponse.json({ error: runError?.message || 'Could not create the test run.' }, { status: 400 });
  }

  const { data: cases, error: casesError } = await supabase.from('test_cases')
    .select('id').eq('project_id', project.id);
  if (casesError) {
    await supabase.from('test_runs').delete().eq('id', run.id);
    return NextResponse.json({ error: 'Could not load test cases for this run.' }, { status: 500 });
  }

  if (cases?.length) {
    const { error: executionError } = await supabase.from('test_executions').insert(
      cases.map((testCase) => ({
        test_run_id: run.id,
        test_case_id: testCase.id,
        organization_id: project.organization_id,
        tester_id: user.id,
        status: 'not_run' as const,
      }))
    );
    if (executionError) {
      await supabase.from('test_runs').delete().eq('id', run.id);
      return NextResponse.json({ error: 'Could not initialize test executions for this run.' }, { status: 500 });
    }
  }

  return NextResponse.json({ testRun: run, testCaseCount: cases?.length ?? 0 }, { status: 201 });
}
