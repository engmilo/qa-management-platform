import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';
import { validateApiKey, hasScope } from '@/lib/api-key-auth';

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
  // TC-PROD-007 — API key branch: if X-API-Key / Authorization is present, enforce scopes BEFORE session logic.
  // If no API key, original session flow below runs unchanged.
  const apiKeyHeader = request.headers.get('x-api-key') || request.headers.get('X-API-Key') || request.headers.get('authorization');
  if (apiKeyHeader) {
    const auth = await validateApiKey(request as unknown as Request);
    if (!auth.valid) return NextResponse.json({ error: auth.error || 'Invalid or revoked API key' }, { status: 401 });
    if (!hasScope(auth.scopes || [], 'runs:write')) return NextResponse.json({ error: `Forbidden: scope required: runs:write, key has only: ${(auth.scopes || []).join(', ') || 'none'}` }, { status: 403 });
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
    const projectId = typeof (body as any).projectId === 'string' ? (body as any).projectId : typeof (body as any).project_id === 'string' ? (body as any).project_id : '';
    const name = typeof body.name === 'string' ? (body.name as string).trim() : '';
    if (!projectId || !name) return NextResponse.json({ error: 'Project and test run name are required.' }, { status: 400 });
    const testPlanIdRaw = typeof (body as any).testPlanId === 'string' ? (body as any).testPlanId : typeof (body as any).test_plan_id === 'string' ? (body as any).test_plan_id : typeof (body as any).plan_id === 'string' ? (body as any).plan_id : '';
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' } as Record<string, string>;
    const projRes = await fetch(`${url}/rest/v1/projects?id=eq.${projectId}&organization_id=eq.${auth.organization_id}&select=id,organization_id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' });
    const projRows = await projRes.json().catch(() => []);
    if (!projRes.ok || !projRows?.[0]) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });
    let testPlanId: string | null = null;
    if (testPlanIdRaw) {
      const planRes = await fetch(`${url}/rest/v1/test_plans?id=eq.${testPlanIdRaw}&project_id=eq.${projectId}&select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' });
      const planRows = await planRes.json().catch(() => []);
      if (!planRes.ok || !planRows?.[0]) return NextResponse.json({ error: 'Select a test plan from this project.' }, { status: 400 });
      testPlanId = planRows[0].id;
    }
    const insertRes = await fetch(`${url}/rest/v1/test_runs`, { method: 'POST', headers, body: JSON.stringify({ project_id: projectId, organization_id: auth.organization_id, name, test_plan_id: testPlanId, status: 'in_progress', description: typeof body.description === 'string' ? (body.description as string).trim() || null : null }) });
    const inserted = await insertRes.json().catch(() => []);
    const run = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!insertRes.ok || !run?.id) return NextResponse.json({ error: 'Could not create the test run.' }, { status: 400 });
    let caseIds: string[] = [];
    const rawCaseIds = Array.isArray((body as any).caseIds) ? (body as any).caseIds : Array.isArray((body as any).case_ids) ? (body as any).case_ids : [];
    const rawSuiteIds = Array.isArray((body as any).suiteIds) ? (body as any).suiteIds : Array.isArray((body as any).suite_ids) ? (body as any).suite_ids : [];
    if (rawCaseIds.length) {
      const cRes = await fetch(`${url}/rest/v1/test_cases?project_id=eq.${projectId}&id=in.(${rawCaseIds.join(',')})&select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' });
      const cRows = await cRes.json().catch(() => []);
      caseIds = (cRows ?? []).map((c: any) => c.id);
    } else if (rawSuiteIds.length) {
      const lRes = await fetch(`${url}/rest/v1/test_suite_cases?test_suite_id=in.(${rawSuiteIds.join(',')})&select=test_case_id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' });
      const lRows = await lRes.json().catch(() => []);
      const ids = [...new Set((lRows ?? []).map((l: any) => l.test_case_id))];
      if (ids.length) {
        const cRes = await fetch(`${url}/rest/v1/test_cases?project_id=eq.${projectId}&id=in.(${ids.join(',')})&select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' });
        const cRows = await cRes.json().catch(() => []);
        caseIds = (cRows ?? []).map((c: any) => c.id);
      }
    } else {
      const cRes = await fetch(`${url}/rest/v1/test_cases?project_id=eq.${projectId}&select=id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' });
      const cRows = await cRes.json().catch(() => []);
      caseIds = (cRows ?? []).map((c: any) => c.id);
    }
    if (!caseIds.length) return NextResponse.json({ testRun: run, testCaseCount: 0 }, { status: 201 });
    const execRes = await fetch(`${url}/rest/v1/test_executions`, { method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(caseIds.map((id) => ({ test_run_id: run.id, test_case_id: id, organization_id: auth.organization_id, status: 'not_run' }))) });
    if (!execRes.ok) { await fetch(`${url}/rest/v1/test_runs?id=eq.${run.id}`, { method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }); return NextResponse.json({ error: 'Could not initialize test executions for this run.' }, { status: 500 }); }
    return NextResponse.json({ testRun: run, testCaseCount: caseIds.length }, { status: 201 });
  }
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

