import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError, UUID_RE } from '@/lib/auth/require-org-permission';

function stats(executions: any[]) {
  const total = executions.length;
  const by = (s: string) => executions.filter((e) => e.status === s).length;
  const passed = by('passed'), failed = by('failed'), blocked = by('blocked'), retest = by('retest'), notRun = by('not_run'), na = by('not_applicable');
  const done = total - notRun;
  return { total, passed, failed, blocked, retest, notRun, notApplicable: na, completed: done, progress: total ? Math.round((done / total) * 100) : 0, passRate: passed + failed ? Math.round((passed / (passed + failed)) * 100) : null };
}

// GET /api/test-runs/[id] — run + stats + plan + project
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Test run not found.' }, { status: 404 });
  const { data: run, error } = await supabase.from('test_runs').select('*, projects(id,name,key), test_plans(id,title)').eq('id', params.id).maybeSingle();
  if (error || !run) return NextResponse.json({ error: 'Test run not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (run as any).organization_id, 'canViewReports'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { data: executions } = await supabase.from('test_executions').select('status').eq('test_run_id', params.id);
  return NextResponse.json({ testRun: run, stats: stats(executions ?? []) });
}

// PATCH /api/test-runs/[id] — rename, assign, complete / reopen
// Body: { name?, assignedTo?, description?, configuration?, status?: 'in_progress' | 'completed' }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Test run not found.' }, { status: 404 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const { data: run, error } = await supabase.from('test_runs').select('id, organization_id, status').eq('id', params.id).maybeSingle();
  if (error || !run) return NextResponse.json({ error: 'Test run not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (run as any).organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim() || null;
  if (typeof body.configuration === 'string') patch.configuration = body.configuration.trim() || null;
  if (typeof body.assignedTo === 'string' && body.assignedTo) patch.assigned_to = body.assignedTo;
  if (body.status === 'completed') { patch.status = 'completed'; patch.completed_at = new Date().toISOString(); }
  if (body.status === 'in_progress') { patch.status = 'in_progress'; patch.completed_at = null; }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const { data: updated, error: updErr } = await supabase.from('test_runs').update(patch).eq('id', params.id).select().single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
  return NextResponse.json({ testRun: updated });
}

// DELETE /api/test-runs/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Test run not found.' }, { status: 404 });
  const { data: run } = await supabase.from('test_runs').select('id, organization_id').eq('id', params.id).maybeSingle();
  if (!run) return NextResponse.json({ error: 'Test run not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (run as any).organization_id, 'canCreateTestPlan'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  const { error } = await supabase.from('test_runs').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true });
}

