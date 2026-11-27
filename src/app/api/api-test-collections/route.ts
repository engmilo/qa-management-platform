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
    .from('api_test_collections')
    .select('*, projects(id,name,key)')
    .order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load API test collections.' }, { status: 500 });
  return NextResponse.json({ collections: data ?? [] });
}

export async function POST(request: NextRequest) {
  const apiKeyHeader = request.headers.get('x-api-key') || request.headers.get('X-API-Key') || request.headers.get('authorization');
  if (apiKeyHeader) {
    const auth = await validateApiKey(request as unknown as Request);
    if (!auth.valid) return NextResponse.json({ error: auth.error || 'Invalid or revoked API key' }, { status: 401 });
    if (!hasScope(auth.scopes || [], 'api-tests:write')) return NextResponse.json({ error: `Forbidden: scope required: api-tests:write` }, { status: 403 });

    const rateLimit = checkApiKeyRateLimit(auth.apiKey?.id, auth.organization_id, 'api-test-collections:POST');
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

    const insertRes = await fetch(`${url}/rest/v1/api_test_collections`, {
      method: 'POST', headers,
      body: JSON.stringify({
        project_id: projectId,
        organization_id: auth.organization_id,
        name,
        description: typeof body.description === 'string' ? body.description.trim() || null : null,
        spec_type: typeof body.specType === 'string' ? body.specType : 'postman',
        spec_content: body.specContent || {},
        base_url: typeof body.baseUrl === 'string' ? body.baseUrl : null,
        headers: body.headers || {},
        auth_config: body.authConfig || {},
        created_by: auth.apiKey?.user_id || null,
      })
    });
    const inserted = await insertRes.json().catch(() => []);
    const collection = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!insertRes.ok || !collection?.id) return NextResponse.json({ error: 'Could not create API test collection.' }, { status: 400 });
    return NextResponse.json({ collection }, { status: 201 });
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

  const { data: collection, error: collectionError } = await supabase.from('api_test_collections').insert({
    project_id: project.id,
    organization_id: (project as any).organization_id,
    name,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    spec_type: typeof body.specType === 'string' ? body.specType : 'postman',
    spec_content: body.specContent || {},
    base_url: typeof body.baseUrl === 'string' ? body.baseUrl : null,
    headers: body.headers || {},
    auth_config: body.authConfig || {},
    created_by: user.id,
  }).select().single();

  if (collectionError || !collection) return NextResponse.json({ error: collectionError?.message || 'Could not create API test collection.' }, { status: 400 });
  return NextResponse.json({ collection }, { status: 201 });
}