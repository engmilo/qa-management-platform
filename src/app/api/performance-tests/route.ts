import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError } from '@/lib/auth/require-org-permission';
import { validateApiKey, hasScope } from '@/lib/api-key-auth';
import { checkApiKeyRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get('projectId');
  let query = supabase
    .from('performance_tests')
    .select('*, projects(id,name,key)')
    .order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load performance tests.' }, { status: 500 });
  return NextResponse.json({ performanceTests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const apiKeyHeader = request.headers.get('x-api-key') || request.headers.get('X-API-Key') || request.headers.get('authorization');
  if (apiKeyHeader) {
    const auth = await validateApiKey(request as unknown as Request);
    if (!auth.valid) return NextResponse.json({ error: auth.error || 'Invalid or revoked API key' }, { status: 401 });
    if (!hasScope(auth.scopes || [], 'performance:write')) return NextResponse.json({ error: `Forbidden: scope required: performance:write` }, { status: 403 });

    const rateLimit = checkApiKeyRateLimit(auth.apiKey?.id, auth.organization_id, 'performance-tests:POST');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.` }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } });
    }

    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }

    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!projectId || !name) return NextResponse.json({ error: 'Project and name are required.' }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' } as Record<string, string>;

    const projRes = await fetch(`${url}/rest/v1/projects?id=eq.${projectId}&organization_id=eq.${auth.organization_id}&select=id,organization_id`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' });
    const projRows = await projRes.json().catch(() => []);
    if (!projRes.ok || !projRows?.[0]) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });

    const insertRes = await fetch(`${url}/rest/v1/performance_tests`, {
      method: 'POST', headers,
      body: JSON.stringify({
        project_id: projectId,
        organization_id: auth.organization_id,
        name,
        description: typeof body.description === 'string' ? body.description.trim() || null : null,
        test_type: typeof body.testType === 'string' ? body.testType : 'load',
        configuration: body.configuration || {},
        script: typeof body.script === 'string' ? body.script : null,
        virtual_users: typeof body.virtualUsers === 'number' ? body.virtualUsers : 100,
        duration_seconds: typeof body.durationSeconds === 'number' ? body.durationSeconds : 300,
        ramp_up_seconds: typeof body.rampUpSeconds === 'number' ? body.rampUpSeconds : 60,
        thresholds: body.thresholds || {},
        created_by: auth.apiKey?.user_id || null,
      })
    });
    const inserted = await insertRes.json().catch(() => []);
    const test = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!insertRes.ok || !test?.id) return NextResponse.json({ error: 'Could not create performance test.' }, { status: 400 });
    return NextResponse.json({ performanceTest: test }, { status: 201 });
  }

  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!projectId || !name) return NextResponse.json({ error: 'Project and name are required.' }, { status: 400 });

  const { data: project, error: projectError } = await supabase.from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });

  try { await requireOrgPermission(supabase, user.id, (project as any).organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  const { data: test, error: testError } = await supabase.from('performance_tests').insert({
    project_id: project.id,
    organization_id: (project as any).organization_id,
    name,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    test_type: typeof body.testType === 'string' ? body.testType : 'load',
    configuration: body.configuration || {},
    script: typeof body.script === 'string' ? body.script : null,
    virtual_users: typeof body.virtualUsers === 'number' ? body.virtualUsers : 100,
    duration_seconds: typeof body.durationSeconds === 'number' ? body.durationSeconds : 300,
    ramp_up_seconds: typeof body.rampUpSeconds === 'number' ? body.rampUpSeconds : 60,
    thresholds: body.thresholds || {},
    created_by: user.id,
  }).select().single();

  if (testError || !test) return NextResponse.json({ error: testError?.message || 'Could not create performance test.' }, { status: 400 });
  return NextResponse.json({ performanceTest: test }, { status: 201 });
}