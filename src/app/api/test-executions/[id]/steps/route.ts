import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

type StepStatus = 'passed' | 'failed' | 'blocked' | 'retest' | 'not_run' | 'untested';
const VALID: StepStatus[] = ['passed', 'failed', 'blocked', 'retest', 'not_run', 'untested'];

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

async function buildSteps(supabase: ReturnType<typeof createRouteSupabaseClient>, executionId: string, testCaseId: string) {
  const { data: templateSteps, error: templateError } = await supabase
    .from('test_case_steps')
    .select('step_number, action, expected_result')
    .eq('test_case_id', testCaseId)
    .order('step_number', { ascending: true });
  if (templateError) throw new Error(templateError.message);

  // NOTE: execution_steps has NO created_at / updated_at — do not select or order by them
  const { data: stepRows, error: rowsError } = await supabase
    .from('execution_steps')
    .select('id, step_number, status, actual_result')
    .eq('test_execution_id', executionId)
    .order('step_number', { ascending: true });
  if (rowsError) throw new Error(rowsError.message);

  const byNumber = new Map<number, NonNullable<typeof stepRows>[number]>();
  (stepRows ?? []).forEach((r) => byNumber.set(r.step_number, r));

  const steps = (templateSteps ?? []).map((t) => {
    const row = byNumber.get(t.step_number);
    return {
      step_number: t.step_number,
      action: t.action,
      expected_result: t.expected_result,
      execution_step_id: row?.id ?? null,
      status: (row?.status ?? 'not_run') as StepStatus,
      actual_result: row?.actual_result ?? '',
    };
  });
  return { templateSteps: templateSteps ?? [], steps };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const executionId = params.id;
  const { data: execution, error: execError } = await supabase
    .from('test_executions')
    .select('id, test_run_id, test_case_id, status')
    .eq('id', executionId)
    .maybeSingle();
  if (execError || !execution) return NextResponse.json({ error: 'Execution not found.' }, { status: 404 });

  let steps: Awaited<ReturnType<typeof buildSteps>>['steps'];
  let templateSteps: Awaited<ReturnType<typeof buildSteps>>['templateSteps'];
  try {
    const built = await buildSteps(supabase, executionId, execution.test_case_id);
    steps = built.steps;
    templateSteps = built.templateSteps;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load steps.' }, { status: 500 });
  }

  if (steps.length && steps.every((s) => s.execution_step_id === null) && templateSteps.length) {
    const { error: insertError } = await supabase.from('execution_steps').insert(
      templateSteps.map((s) => ({
        test_execution_id: executionId,
        step_number: s.step_number,
        status: 'not_run' as const,
        actual_result: null,
      }))
    );
    if (!insertError) {
      try {
        const rebuilt = await buildSteps(supabase, executionId, execution.test_case_id);
        steps = rebuilt.steps;
      } catch { /* keep original */ }
    }
  }

  const derived = deriveOverall(steps);
  let syncedStatus: string | null = null;
  let syncError: string | null = null;
  if (derived && derived !== execution.status) {
    const { error } = await supabase
      .from('test_executions')
      .update({ status: derived, executed_at: derived === 'not_run' ? null : new Date().toISOString() })
      .eq('id', executionId);
    if (error) syncError = error.message;
    else {
      syncedStatus = derived;
      execution.status = derived;
    }
  }

  return NextResponse.json({
    execution,
    steps,
    hasSteps: steps.length > 0,
    derivedStatus: derived,
    syncedStatus,
    syncError,
  });
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

  const stepNumber = typeof body.stepNumber === 'number' ? body.stepNumber : Number(body.stepNumber);
  const status = typeof body.status === 'string' ? body.status : '';
  const actualResult = typeof body.actualResult === 'string' ? body.actualResult : null;
  if (!Number.isInteger(stepNumber) || !VALID.includes(status as StepStatus)) {
    return NextResponse.json({ error: 'stepNumber and a valid status are required.' }, { status: 400 });
  }

  const { data: execution, error: execError } = await supabase
    .from('test_executions')
    .select('id, test_case_id')
    .eq('id', executionId)
    .maybeSingle();
  if (execError || !execution) return NextResponse.json({ error: 'Execution not found.' }, { status: 404 });

  // Self-healing dedup: delete ALL rows for this step, then insert exactly one
  const { error: deleteError } = await supabase
    .from('execution_steps')
    .delete()
    .eq('test_execution_id', executionId)
    .eq('step_number', stepNumber);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  const { error: insertError } = await supabase.from('execution_steps').insert({
    test_execution_id: executionId,
    step_number: stepNumber,
    status,
    actual_result: actualResult,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  let steps: Awaited<ReturnType<typeof buildSteps>>['steps'];
  try {
    steps = (await buildSteps(supabase, executionId, execution.test_case_id)).steps;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not reload steps.' }, { status: 500 });
  }

  const derived = deriveOverall(steps);
  if (derived) {
    const { error: updateError } = await supabase
      .from('test_executions')
      .update({ status: derived, executed_at: derived === 'not_run' ? null : new Date().toISOString() })
      .eq('id', executionId);
    if (updateError) {
      return NextResponse.json({ error: `Step saved but case status could not update: ${updateError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, derivedStatus: derived, steps });
}