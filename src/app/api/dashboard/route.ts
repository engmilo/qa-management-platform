import { NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

export async function GET() {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: cases }, { data: runs }, { data: defects }, { data: execs }] = await Promise.all([
    supabase.from('test_cases').select('*'),
    supabase.from('test_runs').select('*'),
    supabase.from('defects').select('*'),
    supabase.from('test_executions').select('*'),
  ]);

  const allCases = cases ?? [];
  const allRuns = runs ?? [];
  const allDefects = defects ?? [];
  const allExecs = execs ?? [];

  let manual = 0;
  let automated = 0;
  allCases.forEach((c: any) => {
    const v = String(c.automation_type ?? c.type ?? c.automation_status ?? '').toLowerCase();
    if (v.includes('auto') || c.is_automated === true) automated += 1;
    else manual += 1;
  });

  const runStatus = (r: any) => String(r.status ?? r.state ?? r.run_status ?? '').toLowerCase().trim();
  const completedRuns = allRuns.filter((r: any) => runStatus(r) === 'completed').length;
  const inProgressRuns = allRuns.filter((r: any) =>
    ['in_progress', 'in progress', 'active', 'running', 'in-progress'].includes(runStatus(r))
  ).length;

  const defectKey = (d: any) => d.key ?? d.defect_key ?? d.code ?? d.display_id ?? '';
  const defectSummary = (d: any) => d.summary ?? d.title ?? d.name ?? d.description ?? 'Untitled defect';
  const defectStatus = (d: any) => String(d.status ?? '').toLowerCase();
  const openList = allDefects.filter(
    (d: any) => !['closed', 'rejected', 'fixed', 'resolved'].includes(defectStatus(d))
  );
  const openDefects = openList.length;
  const totalDefects = allDefects.length;
  const fixedDefects = allDefects.filter((d: any) =>
    ['fixed', 'closed', 'resolved'].includes(defectStatus(d))
  ).length;
  const criticalDefects = allDefects.filter((d: any) =>
    ['critical', 'blocker', 'highest'].includes(String(d.severity ?? d.priority ?? '').toLowerCase())
  ).length;
  const majorDefects = allDefects.filter((d: any) =>
    ['major', 'high'].includes(String(d.severity ?? d.priority ?? '').toLowerCase())
  ).length;
  const latestDefect = openList[0]
    ? { key: defectKey(openList[0]), title: defectSummary(openList[0]) }
    : null;

  const passed = allExecs.filter((e: any) => String(e.status ?? '').toLowerCase() === 'passed').length;
  const failed = allExecs.filter((e: any) => String(e.status ?? '').toLowerCase() === 'failed').length;
  const blocked = allExecs.filter((e: any) => String(e.status ?? '').toLowerCase() === 'blocked').length;
  const notRun = allExecs.filter((e: any) =>
    ['not_run', 'not run', 'untested', 'notrun', ''].includes(String(e.status ?? '').toLowerCase())
  ).length;
  const passRate = passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : null;

  const passedExecs = allExecs.filter((e: any) => String(e.status ?? '').toLowerCase() === 'passed');
  const lastExec = passedExecs[passedExecs.length - 1];
  const lastPassed = lastExec
    ? (() => {
        const runId = lastExec.test_run_id ?? lastExec.run_id ?? null;
        const tcId = lastExec.test_case_id ?? lastExec.case_id ?? null;
        const tc = allCases.find((c: any) => c.id === tcId);
        const run = allRuns.find((r: any) => r.id === runId);
        return {
          runId,
          testCaseCode: tc?.case_id ?? tc?.key ?? tc?.code ?? '',
          testCaseTitle: tc?.title ?? tc?.name ?? '',
          runName: run?.name ?? run?.title ?? run?.run_name ?? '',
        };
      })()
    : null;

  const recent: any[] = [];
  allRuns.slice(0, 2).forEach((r: any) =>
    recent.push({
      type: 'Test Run',
      title: r.name ?? r.title ?? r.run_name ?? 'Test Run',
      date: r.created_at ?? r.started_at ?? r.date ?? '',
    })
  );
  allDefects.slice(0, 2).forEach((d: any) => {
    const k = defectKey(d);
    recent.push({
      type: 'Defect',
      title: k ? `${k} — ${defectSummary(d)}` : defectSummary(d),
      date: d.created_at ?? '',
    });
  });
  recent.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return NextResponse.json(
    {
      testCases: allCases.length,
      manual,
      automated,
      testRuns: allRuns.length,
      completedRuns,
      inProgressRuns,
      openDefects,
      totalDefects,
      fixedDefects,
      criticalDefects,
      majorDefects,
      latestDefect,
      passed,
      failed,
      blocked,
      notRun,
      passRate,
      lastPassed,
      recent,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}