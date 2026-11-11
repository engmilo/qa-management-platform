import { NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

export async function GET() {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: cases }, { data: runs }, { data: defects }, { data: execs }] = await Promise.all([
    supabase.from('test_cases').select('id'),
    supabase.from('test_runs').select('id,status'),
    supabase.from('defects').select('id,status'),
    // FIX: read Pass Rate from test_executions, not from test_runs
    supabase.from('test_executions').select('status'),
  ]);

  const totalCases = cases?.length ?? 0;
  const totalRuns = runs?.length ?? 0;
  const completedRuns = (runs ?? []).filter((r: any) => (r.status || '').toLowerCase() === 'completed').length;
  const openDefects = (defects ?? []).filter((d: any) => !['closed', 'rejected', 'fixed'].includes((d.status || '').toLowerCase())).length;

  const passed = (execs ?? []).filter((e: any) => e.status === 'passed').length;
  const failed = (execs ?? []).filter((e: any) => e.status === 'failed').length;
  // Pass Rate = Passed / (Passed + Failed) — Blocked / Not Run don't count
  const passRate = (passed + failed) > 0 ? Math.round((passed / (passed + failed)) * 100) : null;

  return NextResponse.json({
    testCases: totalCases, testRuns: totalRuns, completedRuns, openDefects,
    passed, failed, passRate, // 1 Passed, 0 Failed -> 100, not null
  }, { headers: { 'Cache-Control': 'no-store' } });
}