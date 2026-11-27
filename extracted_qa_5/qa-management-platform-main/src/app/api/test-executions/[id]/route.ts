import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

type StepStatus = 'passed' | 'failed' | 'blocked' | 'retest' | 'not_run' | 'untested';

function deriveOverall(steps: { status: string }[]): StepStatus | null {
  if (!steps.length) return null;
  const norm = (s: string) => (s === 'untested' ? 'not_run' : s);
  const statuses = steps.map((s) => norm(s.status));
  if (statuses.every((s) => s === 'not_run')) return 'not_run';
  if (statuses.some((s) => s === 'failed')) return 'failed';
  if (statuses.every((s) => s === 'passed')) return 'passed';
  if (statuses.some((s) => s === 'blocked')) return 'blocked';
  if (statuses.some((s) => s === 'retest')) return 'retest';
  return 'retest';
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const executionId = params.id;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const { data: execution, error: execError } = await supabase
    .from('test_executions')
    .select('id, test_case_id, status')
    .eq('id', executionId)
    .maybeSingle();
  if (execError || !execution) return NextResponse.json({ error: 'Execution not found.' }, { status: 404 });

  const { data: templateSteps } = await supabase
    .from('test_case_steps')
    .select('step_number')
    .eq('test_case_id', execution.test_case_id);
  const hasSteps = (templateSteps?.length ?? 0) > 0;

  let finalStatus: string = typeof body.status === 'string' ? body.status : execution.status;
  let statusWasOverridden = false;

  if (hasSteps) {
    const { data: stepRows } = await supabase
      .from('execution_steps')
      .select('step_number, status')
      .eq('test_execution_id', executionId)
      .order('step_number', { ascending: true });
    const byNumber = new Map<number, string>();
    (stepRows ?? []).forEach((r) => byNumber.set(r.step_number, r.status));
    const allStatuses = (templateSteps ?? []).map((t) => ({ status: byNumber.get(t.step_number) ?? 'not_run' }));
    const derived = deriveOverall(allStatuses);
    if (derived) {
      if (derived !== finalStatus) statusWasOverridden = true;
      finalStatus = derived;
    }
  }

  const patch: Record<string, unknown> = { status: finalStatus };
  if (typeof body.actual_result !== 'undefined') patch.actual_result = body.actual_result;
  else if (typeof (body as { actualResult?: unknown }).actualResult !== 'undefined') patch.actual_result = (body as { actualResult: unknown }).actualResult;
  if (typeof body.comments !== 'undefined') patch.comments = body.comments;
  patch.executed_at = finalStatus === 'not_run' ? null : new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('test_executions')
    .update(patch)
    .eq('id', executionId)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  return NextResponse.json({
    execution: updated,
    derivedStatus: finalStatus,
    statusWasOverridden,
    note: statusWasOverridden ? 'Manual status ignored — case has steps, so status is derived from steps.' : undefined,
  });
}