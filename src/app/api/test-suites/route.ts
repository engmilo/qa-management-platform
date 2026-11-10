import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError } from '@/lib/auth/require-org-permission';
// GET /api/test-suites?projectId= & testPlanId=
export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const projectId = request.nextUrl.searchParams.get('projectId');
  const testPlanId = request.nextUrl.searchParams.get('testPlanId');
  let q = supabase.from('test_suites').select('*, test_suite_cases(test_case_id)').order('sort_order');
  if (projectId) q = q.eq('project_id', projectId);
  if (testPlanId) q = q.eq('test_plan_id', testPlanId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Could not load suites.' }, { status: 500 });
  return NextResponse.json({ testSuites: (data ?? []).map((s: any) => ({ ...s, caseCount: s.test_suite_cases?.length ?? 0 })) });
}
// POST /api/test-suites { projectId, testPlanId?, name, description? }
export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!projectId || !name) return NextResponse.json({ error: 'Project and suite name are required.' }, { status: 400 });
  const { data: project } = await supabase.from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });
  try { await requireOrgPermission(supabase, user.id, (project as any).organization_id, 'canCreateTestCase'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  let testPlanId: string | null = null;
  if (typeof body.testPlanId === 'string' && body.testPlanId) {
    const { data: plan } = await supabase.from('test_plans').select('id').eq('id', body.testPlanId).eq('project_id', project.id).maybeSingle();
    if (!plan) return NextResponse.json({ error: 'Select a test plan from this project.' }, { status: 400 });
    testPlanId = plan.id;
  }
  const { data: suite, error } = await supabase.from('test_suites').insert({ project_id: project.id, organization_id: (project as any).organization_id, test_plan_id: testPlanId, name, description: typeof body.description === 'string' ? body.description.trim() || null : null }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ testSuite: suite }, { status: 201 });
}

