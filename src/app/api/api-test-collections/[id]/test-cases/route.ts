import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError } from '@/lib/auth/require-org-permission';
import { validateApiKey, hasScope } from '@/lib/api-key-auth';
import { checkApiKeyRateLimit } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from('api_test_cases')
    .select('*')
    .eq('collection_id', id)
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: 'Could not load test cases.' }, { status: 500 });
  return NextResponse.json({ testCases: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: collection, error: collError } = await supabase
    .from('api_test_collections')
    .select('organization_id')
    .eq('id', id)
    .maybeSingle();
  if (collError || !collection) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });

  try { await requireOrgPermission(supabase, user.id, collection.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const method = typeof body.method === 'string' ? body.method : 'GET';
  const path = typeof body.path === 'string' ? body.path : '';
  if (!name || !path) return NextResponse.json({ error: 'Name and path are required.' }, { status: 400 });

  const { data: maxOrder } = await supabase
    .from('api_test_cases')
    .select('order_index')
    .eq('collection_id', id)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('api_test_cases')
    .insert({
      collection_id: id,
      organization_id: collection.organization_id,
      name,
      method,
      path,
      headers: body.headers || {},
      query_params: body.queryParams || {},
      body: body.body || null,
      assertions: body.assertions || [],
      test_type: typeof body.testType === 'string' ? body.testType : 'functional',
      order_index: (maxOrder?.order_index ?? -1) + 1,
    })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not create test case.' }, { status: 500 });
  return NextResponse.json({ testCase: data }, { status: 201 });
}