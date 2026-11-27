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
    .from('performance_tests')
    .select('*, projects(id,name,key)')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not load performance test.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Performance test not found.' }, { status: 404 });
  return NextResponse.json({ performanceTest: data });
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

  const { data: test, error: testError } = await supabase
    .from('performance_tests')
    .select('organization_id')
    .eq('id', id)
    .maybeSingle();
  if (testError || !test) return NextResponse.json({ error: 'Test not found.' }, { status: 404 });

  try { await requireOrgPermission(supabase, user.id, test.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim() || null;
  if (typeof body.testType === 'string') updates.test_type = body.testType;
  if (typeof body.virtualUsers === 'number') updates.virtual_users = body.virtualUsers;
  if (typeof body.durationSeconds === 'number') updates.duration_seconds = body.durationSeconds;
  if (typeof body.rampUpSeconds === 'number') updates.ramp_up_seconds = body.rampUpSeconds;
  if (body.configuration) updates.configuration = body.configuration;
  if (body.thresholds) updates.thresholds = body.thresholds;

  const { data, error } = await supabase
    .from('performance_tests')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not update performance test.' }, { status: 500 });
  return NextResponse.json({ performanceTest: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: test, error: testError } = await supabase
    .from('performance_tests')
    .select('organization_id')
    .eq('id', id)
    .maybeSingle();
  if (testError || !test) return NextResponse.json({ error: 'Test not found.' }, { status: 404 });

  try { await requireOrgPermission(supabase, user.id, test.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  const { error } = await supabase.from('performance_tests').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete performance test.' }, { status: 500 });
  return NextResponse.json({ success: true });
}