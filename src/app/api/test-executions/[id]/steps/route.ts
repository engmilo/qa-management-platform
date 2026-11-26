import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

// P1.3 Per-step execution — API only
// GET  /api/test-executions/[id]/steps  — returns steps for one execution
// PATCH /api/test-executions/[id]/steps — saves per-step results + updates overall execution status
// AUTO-COMPLETE: if every execution in the run is decided (not not_run),
// the run is marked completed automatically.

function overallFromSteps(steps: { status: string }[]) {
  if (steps.length === 0) return 'not_run';
  if (steps.some((s) => s.status === 'failed')) return 'failed';
  if (steps.some((s) => s.status === 'blocked')) return 'blocked';
  if (steps.every((s) => s.status === 'passed')) return 'passed';
  if (steps.some((s) => s.status === 'retest')) return 'retest';
  if (steps.every((s) => s.status === 'not_run')) return 'not_run';
  return 'not_run';
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: exec, error: execErr } = await supabase
    .from('test_executions')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (execErr || !exec) return NextResponse.json({ error: 'Execution not found.' }, { status: 404 });

  const [{ data: caseSteps }, { data: execSteps }] = await Promise.all([
    supabase.from('test_case_steps').select('*').eq('test_case_id', exec.test_case_id).order('step_number'),
    supabase.from('test_execution_steps').select('*').eq('test_execution_id', params.id).order('step_number'),
  ]);

  const savedByNumber = new Map((execSteps ?? []).map((s: any) => [s.step_number, s]));
  const base = (caseSteps ?? []).length > 0 ? caseSteps : (execSteps ?? []);
  const steps = base.map((s: any) => {
    const saved = savedByNumber.get(s.step_number);
    return {
      step_number: s.step_number,
      action: saved?.action ?? s.action ?? '',
      expected_result: saved?.expected_result ?? s.expected_result ?? '',
      status: saved?.status ?? 'not_run',
      actual_result: saved?.actual_result ?? '',
      comments: saved?.comments ?? '',
      test_case_step_id: s.id ?? saved?.test_case_step_id ?? null,
    };
  });

  return NextResponse.json({ execution: exec, steps });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!Array.isArray(body.steps)) return NextResponse.json({ error: 'steps array required' }, { status: 400 });

  const { data: exec, error: execErr } = await supabase
    .from('test_executions')
    .select('id, test_case_id, test_run_id')
    .eq('id', params.id)
    .maybeSingle();
  if (execErr || !exec) return NextResponse.json({ error: 'Execution not found.' }, { status: 404 });

  const rows = body.steps.map((s: any) => ({
    test_execution_id: params.id,
    test_case_step_id: s.test_case_step_id ?? null,
    step_number: Number(s.step_number),
    action: s.action ?? '',
    expected_result: s.expected_result ?? '',
    status: ['not_run', 'passed', 'failed', 'blocked', 'retest', 'not_applicable'].includes(s.status) ? s.status : 'not_run',
    actual_result: s.actual_result ?? '',
    comments: s.comments ?? '',
  }));

  const { error: upErr } = await supabase
    .from('test_execution_steps')
    .upsert(rows, { onConflict: 'test_execution_id,step_number' });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const overall = overallFromSteps(rows);
  const { error: updErr } = await supabase
    .from('test_executions')
    .update({ status: overall, executed_at: new Date().toISOString() })
    .eq('id', params.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  // AUTO-COMPLETE RUN
  // If this execution is still not_run, run is not done yet, skip.
  // If every execution in this run is decided (passed / failed / blocked / retest / not_applicable),
  // mark the run completed automatically.
  let autoCompleted = false;
  if (overall !== 'not_run' && (exec as any).test_run_id) {
    const { data: allExecs } = await supabase
      .from('test_executions')
      .select('status')
      .eq('test_run_id', (exec as any).test_run_id);

    const allDecided =
      (allExecs ?? []).length > 0 &&
      (allExecs ?? []).every((e: any) => e.status !== 'not_run');

    if (allDecided) {
      const { data: run } = await supabase
        .from('test_runs')
        .select('id, status')
        .eq('id', (exec as any).test_run_id)
        .maybeSingle();

      if (run && (run as any).status !== 'completed') {
        const { error: runErr } = await supabase
          .from('test_runs')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', (exec as any).test_run_id);
        if (!runErr) autoCompleted = true;
      }
    }
  }

  return NextResponse.json({ ok: true, overall, autoCompleted });
}