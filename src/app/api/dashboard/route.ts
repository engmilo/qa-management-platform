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
    const raw = c.automation_status ?? c.automationStatus ?? null;
    if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
      const v = String(raw).toLowerCase().trim().replace(/-/g, '_');
      if (v === 'automated') automated += 1;
      else manual += 1;
    } else if (c.is_automated === true) {
      automated += 1;
    } else {
      manual += 1;
    }
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
  const sortedPassed = [...passedExecs].sort(
    (a: any, b: any) =>
      new Date(b.executed_at || b.updated_at || b.created_at || 0).getTime() -
      new Date(a.executed_at || a.updated_at || a.created_at || 0).getTime()
  );
  const lastExec = sortedPassed[0];
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

  // FIX: Recent Activity — sort ALL items by latest activity first, then take top
  // Run activity date = completed_at || updated_at || created_at, not just created_at,
  // so executing / completing a run moves it to the top.
  const runDate = (r: any) => r.completed_at || r.updated_at || r.created_at || r.started_at || r.date || '';
  const defectDate = (d: any) => d.updated_at || d.created_at || '';
  const execDate = (e: any) => e.executed_at || e.updated_at || e.created_at || '';

  const recent: any[] = [];

  [...allRuns]
    .sort((a: any, b: any) => new Date(runDate(b)).getTime() - new Date(runDate(a)).getTime())
    .slice(0, 3)
    .forEach((r: any) =>
      recent.push({
        type: 'Test Run',
        title: r.name ?? r.title ?? r.run_name ?? 'Test Run',
        date: runDate(r),
      })
    );

  [...allDefects]
    .sort((a: any, b: any) => new Date(defectDate(b)).getTime() - new Date(defectDate(a)).getTime())
    .slice(0, 2)
    .forEach((d: any) => {
      const k = defectKey(d);
      recent.push({
        type: 'Defect',
        title: k ? `${k} — ${defectSummary(d)}` : defectSummary(d),
        date: defectDate(d),
      });
    });

  // Executions are activity too, so a Passed test case shows up even if the run was created earlier
  [...allExecs]
    .filter((e: any) => String(e.status ?? '').toLowerCase() !== 'not_run' && String(e.status ?? '').toLowerCase() !== '')
    .sort((a: any, b: any) => new Date(execDate(b)).getTime() - new Date(execDate(a)).getTime())
    .slice(0, 3)
    .forEach((e: any) => {
      const tc = allCases.find((c: any) => c.id === (e.test_case_id ?? e.case_id));
      const title = tc ? `${tc.title ?? tc.name ?? 'Test Case'}` : 'Test Case';
      recent.push({
        type: 'Test Execution',
        title: `${String(e.status ?? '').toUpperCase()}: ${title}`,
        date: execDate(e),
      });
    });

  recent.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  const recentTop = recent.slice(0, 5);

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
      recent: recentTop,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}