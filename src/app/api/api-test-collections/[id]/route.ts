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
    .from('api_test_collections')
    .select('*, projects(id,name,key)')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not load collection.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });
  return NextResponse.json({ collection: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const { data: collection, error: collError } = await supabase
    .from('api_test_collections')
    .select('organization_id')
    .eq('id', id)
    .maybeSingle();
  if (collError || !collection) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });

  try { await requireOrgPermission(supabase, user.id, collection.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim() || null;
  if (typeof body.baseUrl === 'string') updates.base_url = body.baseUrl;
  if (body.headers) updates.headers = body.headers;
  if (body.authConfig) updates.auth_config = body.authConfig;
  if (body.specContent) updates.spec_content = body.specContent;

  const { data, error } = await supabase
    .from('api_test_collections')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not update collection.' }, { status: 500 });
  return NextResponse.json({ collection: data });
}

export async function DELETE(
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

  const { error } = await supabase.from('api_test_collections').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete collection.' }, { status: 500 });
  return NextResponse.json({ success: true });
}