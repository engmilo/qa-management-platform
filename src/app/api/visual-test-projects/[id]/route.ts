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
    .from('visual_test_projects')
    .select('*, projects(id,name,key)')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not load visual test project.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Visual test project not found.' }, { status: 404 });
  return NextResponse.json({ project: data });
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

  const { data: project, error: projError } = await supabase
    .from('visual_test_projects')
    .select('organization_id')
    .eq('id', id)
    .maybeSingle();
  if (projError || !project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  try { await requireOrgPermission(supabase, user.id, project.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim() || null;
  if (body.browsers) updates.browsers = body.browsers;
  if (body.viewports) updates.viewports = body.viewports;
  if (typeof body.threshold === 'number') updates.threshold = body.threshold;

  const { data, error } = await supabase
    .from('visual_test_projects')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not update project.' }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: project, error: projError } = await supabase
    .from('visual_test_projects')
    .select('organization_id')
    .eq('id', id)
    .maybeSingle();
  if (projError || !project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  try { await requireOrgPermission(supabase, user.id, project.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  const { error } = await supabase.from('visual_test_projects').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete project.' }, { status: 500 });
  return NextResponse.json({ success: true });
}