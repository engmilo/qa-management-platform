import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Test run not found.' }, { status: 404 });
  const { data: run, error: runErr } = await supabase.from('test_runs').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (runErr || !run) return NextResponse.json({ error: 'Test run not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (run as any).organization_id, 'canViewReports'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const statusFilter = request.nextUrl.searchParams.get('status');
  let q = supabase.from('test_executions').select('*, test_cases(id,case_key,title,priority,test_type,category,description,preconditions)').eq('test_run_id', params.id);
  if (statusFilter) q = q.eq('status', statusFilter);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: 'Could not load executions.' }, { status: 500 });
  const sorted = (data ?? []).sort((a: any, b: any) => String(a.test_cases?.case_key ?? '').localeCompare(String(b.test_cases?.case_key ?? '')));
  return NextResponse.json({ executions: sorted });
}

