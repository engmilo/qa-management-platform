import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError } from '@/lib/auth/require-org-permission';
const severities = ['trivial','minor','major','critical','blocker'] as const;
const priorities = ['low','medium','high','critical'] as const;
export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const projectId = request.nextUrl.searchParams.get('projectId');
  let query = supabase.from('defects').select('*').order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load defects.' }, { status: 500 });
  return NextResponse.json({ defects: data ?? [] });
}
export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
  if (!projectId || !summary) return NextResponse.json({ error: 'Project and summary are required.' }, { status: 400 });
  const { data: project, error: projectError } = await supabase.from('projects').select('id, organization_id, key').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });
  try { await requireOrgPermission(supabase, user.id, (project as any).organization_id, 'canCreateDefect'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  // Auto-generate key if caller did not supply one (execution page + new defect page can omit it)
  let defectKey = typeof body.defectKey === 'string' ? body.defectKey.trim().toUpperCase() : '';
  if (!defectKey) {
    const prefix = `${(project as any).key ?? 'BUG'}-`;
    const { count } = await supabase.from('defects').select('id', { count: 'exact', head: true }).eq('project_id', projectId);
    let n = (count ?? 0) + 1;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = `${prefix}${n}`;
      const { data: existing } = await supabase.from('defects').select('id').eq('project_id', projectId).eq('defect_key', candidate).maybeSingle();
      if (!existing) { defectKey = candidate; break; }
      n++;
    }
    if (!defectKey) defectKey = `${prefix}${Date.now().toString().slice(-6)}`;
  }
  const severity = typeof body.severity === 'string' && severities.includes(body.severity as any) ? body.severity : 'major';
  const priority = typeof body.priority === 'string' && priorities.includes(body.priority as any) ? body.priority : 'medium';
  // Validate linked execution / case belong to this project
  let testCaseId: string | null = null, testExecutionId: string | null = null;
  if (typeof body.testCaseId === 'string' && body.testCaseId) {
    const { data: tc } = await supabase.from('test_cases').select('id').eq('id', body.testCaseId).eq('project_id', projectId).maybeSingle();
    if (!tc) return NextResponse.json({ error: 'Linked test case must belong to this project.' }, { status: 400 });
    testCaseId = tc.id;
  }
  if (typeof body.testExecutionId === 'string' && body.testExecutionId) {
    const { data: ex } = await supabase.from('test_executions').select('id, test_case_id, test_runs!inner(project_id)').eq('id', body.testExecutionId).maybeSingle();
    if (!ex) return NextResponse.json({ error: 'Linked execution not found.' }, { status: 400 });
    testExecutionId = ex.id;
    if (!testCaseId) testCaseId = (ex as any).test_case_id;
  }
  let assignedTo: string | null = null;
  if (typeof body.assignedTo === 'string' && body.assignedTo) {
    const { data: m } = await supabase.from('organization_members').select('user_id').eq('organization_id', (project as any).organization_id).eq('user_id', body.assignedTo).maybeSingle();
    if (!m) return NextResponse.json({ error: 'Assignee must be a member of this organization.' }, { status: 400 });
    assignedTo = body.assignedTo;
  }
  const { data: defect, error } = await supabase.from('defects').insert({
    project_id: project.id, organization_id: (project as any).organization_id, defect_key: defectKey, summary,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    severity, priority, status: 'new',
    environment: typeof body.environment === 'string' ? body.environment.trim() || null : null,
    steps_to_reproduce: typeof body.stepsToReproduce === 'string' ? body.stepsToReproduce.trim() || null : null,
    expected_result: typeof body.expectedResult === 'string' ? body.expectedResult.trim() || null : null,
    actual_result: typeof body.actualResult === 'string' ? body.actualResult.trim() || null : null,
    reporter_id: user.id, assigned_to: assignedTo, test_case_id: testCaseId, test_execution_id: testExecutionId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That defect key is already used in this project.' : error.message }, { status: error.code === '23505' ? 409 : 400 });
  return NextResponse.json({ defect }, { status: 201 });
}

