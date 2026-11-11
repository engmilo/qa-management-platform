import { NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

export async function GET() {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: cases }, { data: runs }, { data: defects }, { data: execs }] = await Promise.all([
    supabase.from('test_cases').select('*').order('created_at', { ascending: false }),
    supabase.from('test_runs').select('*').order('created_at', { ascending: false }),
    supabase.from('defects').select('*').order('created_at', { ascending: false }),
    supabase.from('test_executions').select('*'),
  ]);

  const allCases = cases ?? [];
  const allRuns = runs ?? [];
  const allDefects = defects ?? [];
  const allExecs = execs ?? [];

  // TEST CASES breakdown — manual vs automated, defensive if column names differ
  let manual = 0, automated = 0;
  allCases.forEach((c: any) => {
    const v = String(c.automation_type ?? c.type ?? c.automation_status ?? '').toLowerCase();
    if (v.includes('auto') || c.is_automated === true) automated += 1;
    else manual += 1;
  });

  // TEST RUNS breakdown
  const completedRuns = allRuns.filter((r: any) => String(r.status ?? '').toLowerCase() === 'completed').length;
  const inProgressRuns = allRuns.filter((r: any) => ['in_progress', 'in progress', 'active', 'running'].includes(String(r.status ?? '').toLowerCase())).length;

  // DEFECTS breakdown — open only
  const openList = allDefects.filter((d: any) => !['closed', 'rejected', 'fixed', 'resolved'].includes(String(d.status ?? '').toLowerCase()));
  const openDefects = openList.length;
  const criticalDefects = openList.filter((d: any) => ['critical', 'blocker', 'highest'].includes(String(d.severity ?? d.priority ?? '').toLowerCase())).length;
  const majorDefects = openList.filter((d: any) => ['major', 'high'].includes(String(d.severity ?? d.priority ?? '').toLowerCase())).length;
  const latestDefect = openList[0] ? { id: openList[0].id, title: openList[0].title ?? openList[0].name ?? 'Untitled defect' } : null;

  // EXECUTIONS — Pass Rate = Passed / (Passed + Failed)
  const passed = allExecs.filter((e: any) => String(e.status ?? '').toLowerCase() === 'passed').length;
  const failed = allExecs.filter((e: any) => String(e.status ?? '').toLowerCase() === 'failed').length;
  const blocked = allExecs.filter((e: any) => String(e.status ?? '').toLowerCase() === 'blocked').length;
  const notRun = allExecs.filter((e: any) => ['not_run', 'not run', 'untested', 'notrun', ''].includes(String(e.status ?? '').toLowerCase())).length;
  const passRate = (passed + failed) > 0 ? Math.round((passed / (passed + failed)) * 100) : null;

  // Recent Activity — latest runs + defects
  const recent: any[] = [];
  allRuns.slice(0, 2).forEach((r: any) => recent.push({ type: 'Test Run', title: r.title ?? r.name ?? 'Test Run', date: r.created_at }));
  allDefects.slice(0, 2).forEach((d: any) => recent.push({ type: 'Defect', title: `${d.id ? d.id : ''} — ${d.title ?? d.name ?? ''}`.trim(), date: d.created_at }));
  recent.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return NextResponse.json({
    testCases: allCases.length, manual, automated,
    testRuns: allRuns.length, completedRuns, inProgressRuns,
    openDefects, criticalDefects, majorDefects, latestDefect,
    passed, failed, blocked, notRun, passRate,
    recent,
  }, { headers: { 'Cache-Control': 'no-store' } });
}