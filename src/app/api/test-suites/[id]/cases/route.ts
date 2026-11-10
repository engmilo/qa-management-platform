import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';
// POST /api/test-suites/[id]/cases { testCaseId } — add one case (idempotent)
// DELETE /api/test-suites/[id]/cases?testCaseId=xxx — remove one case
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const testCaseId = typeof body.testCaseId === 'string' ? body.testCaseId : '';
  if (!UUID_RE.test(testCaseId)) return NextResponse.json({ error: 'Select a test case.' }, { status: 400 });
  const { data: s } = await supabase.from('test_suites').select('id, organization_id, project_id').eq('id', params.id).maybeSingle();
  if (!s) return NextResponse.json({ error: 'Suite not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (s as any).organization_id, 'canEditTestCase'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { data: tc } = await supabase.from('test_cases').select('id').eq('id', testCaseId).eq('project_id', (s as any).project_id).maybeSingle();
  if (!tc) return NextResponse.json({ error: 'Choose a test case from the same project as this suite.' }, { status: 400 });
  const { error } = await supabase.from('test_suite_cases').insert({ test_suite_id: params.id, test_case_id: testCaseId });
  if (error && (error as any).code !== '23505') return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ added: true });
}
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const testCaseId = request.nextUrl.searchParams.get('testCaseId') ?? '';
  const { data: s } = await supabase.from('test_suites').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!s) return NextResponse.json({ error: 'Suite not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (s as any).organization_id, 'canEditTestCase'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { error } = await supabase.from('test_suite_cases').delete().eq('test_suite_id', params.id).eq('test_case_id', testCaseId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ removed: true });
}

