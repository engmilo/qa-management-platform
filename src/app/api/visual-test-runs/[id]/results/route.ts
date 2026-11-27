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
  const { data: run, error: runError } = await supabase
    .from('visual_test_runs')
    .select('organization_id')
    .eq('id', id)
    .maybeSingle();
  if (runError || !run) return NextResponse.json({ error: 'Run not found.' }, { status: 404 });

  try { await requireOrgPermission(supabase, user.id, run.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
  const { data, error } = await supabase
    .from('visual_test_results')
    .select('*')
    .eq('run_id', id)
    .order('executed_at', { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Could not load results.' }, { status: 500 });
  return NextResponse.json({ results: data ?? [] });
}