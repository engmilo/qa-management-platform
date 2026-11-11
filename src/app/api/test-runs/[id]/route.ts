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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Test run not found.' }, { status: 404 });
  const { data: run, error } = await supabase.from('test_runs').select('*, projects(id,name,key), test_plans(id,title)').eq('id', params.id).maybeSingle();
  if (error || !run) return NextResponse.json({ error: 'Test run not found.' }, { status: 404 });
  try { await requireOrgPermission(supabase, user.id, (run as any).organization_id, 'canViewReports'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }
  // FIX: include case_key — was only (id,title)
  const { data: executions } = await supabase.from('test_executions').select('id,test_case_id,status,actual_result,executed_at,test_cases(id,title,case_key)').eq('test_run_id', params.id);
  const list = executions ?? [];
  let assignee_name = null, assignee_email = null;
  if ((run as any).assigned_to) {
    const { data: prof } = await supabase.from('profiles').select('full_name,email').eq('id', (run as any).assigned_to).maybeSingle();
    if (prof) { assignee_name = (prof as any).full_name; assignee_email = (prof as any).email; }
  }
  const runWithName = { ...run, assignee_name, assignee_email };
  return NextResponse.json({ testRun: runWithName, run: runWithName, test_run: runWithName, data: runWithName, stats: stats(list), executions: list, test_cases: list });
}

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

  // FIX: per-case result — { test_case_id / execution_id, status/result }
  if (body.test_case_id || body.execution_id) {
    const raw = typeof (body.status ?? body.result) === 'string' ? String(body.status ?? body.result).toLowerCase().trim() : '';
    const map: Record<string, string> = { passed: 'passed', pass: 'passed', failed: 'failed', fail: 'failed', blocked: 'blocked', block: 'blocked', not_run: 'not_run', notrun: 'not_run', retest: 'retest', not_applicable: 'not_applicable', skipped: 'not_applicable', skip: 'not_applicable' };
    const execStatus = map[raw] || 'not_run';
    let q = supabase.from('test_executions').update({ status: execStatus, executed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('test_run_id', params.id);
    if (body.execution_id) q = q.eq('id', String(body.execution_id));
    else q = q.eq('test_case_id', String(body.test_case_id));
    const { error: updErr } = await q;
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
    const { data: execs } = await supabase.from('test_executions').select('id,test_case_id,status,test_cases(id,title,case_key)').eq('test_run_id', params.id);
    return NextResponse.json({ executions: execs ?? [], stats: stats(execs ?? []) });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.description === 'string') patch.description = body.description.trim() || null;
  if (typeof body.configuration === 'string') patch.configuration = body.configuration.trim() || null;
  if (typeof body.assignedTo === 'string' && body.assignedTo) patch.assigned_to = body.assignedTo;
  const s = typeof body.status === 'string' ? body.status.toLowerCase().trim().replace(' ', '_') : '';
  if (s === 'completed' || s === 'complete') { patch.status = 'completed'; patch.completed_at = new Date().toISOString(); }
  if (s === 'in_progress' || s === 'inprogress') { patch.status = 'in_progress'; patch.completed_at = null; }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const { data: updated, error: updErr } = await supabase.from('test_runs').update(patch).eq('id', params.id).select().single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });
  return NextResponse.json({ testRun: updated, run: updated, data: updated });
}

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