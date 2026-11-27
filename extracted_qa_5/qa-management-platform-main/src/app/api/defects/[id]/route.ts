import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';
const SEVERITIES = ['trivial','minor','major','critical','blocker'];
const PRIORITIES = ['low','medium','high','critical'];
const STATUSES = ['new','open','in_progress','fixed','ready_for_retest','reopened','closed','rejected'];
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Defect not found.' }, { status: 404 });
  const { data: d, error } = await supabase.from('defects').select('*, test_cases(case_key,title), test_executions(id,status)').eq('id', params.id).maybeSingle();
  if (error || !d) return NextResponse.json({ error: 'Defect not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (d as any).organization_id, 'canViewReports'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  return NextResponse.json({ defect: d });
}
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const { data: d } = await supabase.from('defects').select('id, organization_id, project_id').eq('id', params.id).maybeSingle();
  if (!d) return NextResponse.json({ error: 'Defect not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (d as any).organization_id, 'canEditDefect'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const patch: Record<string, unknown> = {};
  if (typeof body.summary === 'string' && body.summary.trim()) patch.summary = body.summary.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim() || null;
  if (typeof body.severity === 'string' && SEVERITIES.includes(body.severity)) patch.severity = body.severity;
  if (typeof body.priority === 'string' && PRIORITIES.includes(body.priority)) patch.priority = body.priority;
  if (typeof body.status === 'string' && STATUSES.includes(body.status)) patch.status = body.status;
  if (typeof body.environment === 'string') patch.environment = body.environment.trim() || null;
  if (typeof body.stepsToReproduce === 'string') patch.steps_to_reproduce = body.stepsToReproduce.trim() || null;
  if (typeof body.expectedResult === 'string') patch.expected_result = body.expectedResult.trim() || null;
  if (typeof body.actualResult === 'string') patch.actual_result = body.actualResult.trim() || null;
  if (typeof body.assignedTo === 'string') patch.assigned_to = body.assignedTo || null;
  if (typeof body.testCaseId === 'string') patch.test_case_id = body.testCaseId || null;
  if (typeof body.testExecutionId === 'string') patch.test_execution_id = body.testExecutionId || null;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  // assigned user must be org member
  if (patch.assigned_to) {
    const { data: m } = await supabase.from('organization_members').select('user_id').eq('organization_id', (d as any).organization_id).eq('user_id', patch.assigned_to as string).maybeSingle();
    if (!m) return NextResponse.json({ error: 'Assignee must be a member of this organization.' }, { status: 400 });
  }
  const { data: updated, error } = await supabase.from('defects').update(patch).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ defect: updated });
}
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: d } = await supabase.from('defects').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!d) return NextResponse.json({ error: 'Defect not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (d as any).organization_id, 'canDeleteDefect'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { error } = await supabase.from('defects').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}

