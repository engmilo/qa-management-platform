import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

// P1.3 Per-step execution — API only
// GET  /api/test-executions/[id]/steps  — returns steps for one execution (merged with test_case_steps)
// PATCH /api/test-executions/[id]/steps — saves per-step results + updates overall execution status

function overallFromSteps(steps: { status: string }[]) {
  if (steps.length === 0) return 'not_run';
  if (steps.some((s) => s.status === 'failed')) return 'failed';
  if (steps.some((s) => s.status === 'blocked')) return 'blocked';
  if (steps.every((s) => s.status === 'passed')) return 'passed';
  if (steps.some((s) => s.status === 'retest')) return 'retest';
  if (steps.every((s) => s.status === 'not_run')) return 'not_run';
  // Some passed, rest not run yet — keep as not_run until all are decided
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
  // If no per-step rows saved yet, show the definition steps as not_run
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
    .select('id, test_case_id')
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

  // Upsert on unique (test_execution_id, step_number)
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

  return NextResponse.json({ ok: true, overall });
}
