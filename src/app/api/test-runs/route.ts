import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const projectId = request.nextUrl.searchParams.get('projectId');
  let query = supabase.from('test_runs').select('*, projects(id,name,key)').order('started_at', { ascending: false });
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
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!projectId || !name) return NextResponse.json({ error: 'Project and test run name are required.' }, { status: 400 });
  const { data: project, error: projectError } = await supabase.from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });
  try { await requireOrgPermission(supabase, user.id, (project as any).organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  let testPlanId: string | null = null;
  if (typeof body.testPlanId === 'string' && body.testPlanId) {
    const { data: plan } = await supabase.from('test_plans').select('id').eq('id', body.testPlanId).eq('project_id', project.id).maybeSingle();
    if (!plan) return NextResponse.json({ error: 'Select a test plan from this project.' }, { status: 400 });
    testPlanId = plan.id;
  }
  // Assignee must be a member of the org
  let assignedTo = user.id;
  if (typeof body.assignedTo === 'string' && body.assignedTo && UUID_RE.test(body.assignedTo)) {
    const { data: m } = await supabase.from('organization_members').select('user_id').eq('organization_id', (project as any).organization_id).eq('user_id', body.assignedTo).maybeSingle();
    if (m) assignedTo = body.assignedTo;
  }
  const { data: run, error: runError } = await supabase.from('test_runs').insert({
    project_id: project.id, organization_id: (project as any).organization_id, name,
    test_plan_id: testPlanId, assigned_to: assignedTo, status: 'in_progress',
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    configuration: typeof body.configuration === 'string' ? body.configuration.trim() || null : null,
  }).select().single();
  if (runError || !run) return NextResponse.json({ error: runError?.message || 'Could not create the test run.' }, { status: 400 });

  // Resolve cases: explicit caseIds > suiteIds > all cases in project
  let caseIds: string[] = [];
  const rawCaseIds = Array.isArray(body.caseIds) ? body.caseIds.filter((x): x is string => typeof x === 'string') : [];
  const rawSuiteIds = Array.isArray(body.suiteIds) ? body.suiteIds.filter((x): x is string => typeof x === 'string') : [];
  if (rawCaseIds.length) {
    const { data: cases } = await supabase.from('test_cases').select('id').eq('project_id', project.id).in('id', rawCaseIds);
    caseIds = (cases ?? []).map((c: any) => c.id);
  } else if (rawSuiteIds.length) {
    const { data: links } = await supabase.from('test_suite_cases').select('test_case_id').in('test_suite_id', rawSuiteIds);
    caseIds = [...new Set((links ?? []).map((l: any) => l.test_case_id))];
    if (caseIds.length) {
      const { data: cases } = await supabase.from('test_cases').select('id').eq('project_id', project.id).in('id', caseIds);
      caseIds = (cases ?? []).map((c: any) => c.id);
    }
  } else {
    const { data: cases } = await supabase.from('test_cases').select('id').eq('project_id', project.id);
    caseIds = (cases ?? []).map((c: any) => c.id);
  }
  if (!caseIds.length) {
    // Keep the empty run — UI shows "No cases" and user can add cases later via re-create. Do not fail.
    return NextResponse.json({ testRun: run, testCaseCount: 0 }, { status: 201 });
  }
  const { error: executionError } = await supabase.from('test_executions').insert(caseIds.map((id) => ({ test_run_id: (run as any).id, test_case_id: id, organization_id: (project as any).organization_id, tester_id: assignedTo, status: 'not_run' as const })));
  if (executionError) {
    await supabase.from('test_runs').delete().eq('id', (run as any).id);
    return NextResponse.json({ error: 'Could not initialize test executions for this run.' }, { status: 500 });
  }
  return NextResponse.json({ testRun: run, testCaseCount: caseIds.length }, { status: 201 });
}

