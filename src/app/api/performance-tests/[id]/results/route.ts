import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError } from '@/lib/auth/require-org-permission';

export async function GET(
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

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
  const { data, error } = await supabase
    .from('performance_test_results')
    .select('*')
    .eq('performance_test_id', id)
    .order('timestamp', { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Could not load results.' }, { status: 500 });
  return NextResponse.json({ results: data ?? [] });
}