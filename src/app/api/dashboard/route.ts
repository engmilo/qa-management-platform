import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id);

  if (membershipError) {
    return NextResponse.json({ error: 'Could not load organization access.' }, { status: 500 });
  }

  const organizationIds = memberships?.map((membership) => membership.organization_id) ?? [];
  if (organizationIds.length === 0) {
    return NextResponse.json({
      stats: {
        projectCount: 0,
        requirementCount: 0,
        testCaseCount: 0,
        passRate: null,
        openDefectCount: 0,
        criticalDefectCount: 0,
      },
      executionProgress: [],
      recentDefects: [],
    });
  }

  const [
    projects,
    requirements,
    testCases,
    openDefects,
    criticalDefects,
    passedExecutions,
    failedExecutions,
    recentDefects,
    recentRuns,
  ] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).in('organization_id', organizationIds),
    supabase.from('requirements').select('id', { count: 'exact', head: true }).in('organization_id', organizationIds),
    supabase.from('test_cases').select('id', { count: 'exact', head: true }).in('organization_id', organizationIds),
    supabase.from('defects').select('id', { count: 'exact', head: true }).in('organization_id', organizationIds)
      .in('status', ['new', 'open', 'in_progress', 'ready_for_retest', 'reopened']),
    supabase.from('defects').select('id', { count: 'exact', head: true }).in('organization_id', organizationIds)
      .in('severity', ['critical', 'blocker']).not('status', 'in', '(closed,rejected)'),
    supabase.from('test_executions').select('id', { count: 'exact', head: true })
      .in('organization_id', organizationIds).eq('status', 'passed'),
    supabase.from('test_executions').select('id', { count: 'exact', head: true })
      .in('organization_id', organizationIds).eq('status', 'failed'),
    supabase.from('defects').select('id, defect_key, summary, severity, status')
      .in('organization_id', organizationIds).order('created_at', { ascending: false }).limit(3),
    supabase.from('test_runs').select('id, name')
      .in('organization_id', organizationIds).order('started_at', { ascending: false }).limit(3),
  ]);

  const errors = [projects.error, requirements.error, testCases.error, openDefects.error,
    criticalDefects.error, passedExecutions.error, failedExecutions.error, recentDefects.error, recentRuns.error];
  if (errors.some(Boolean)) {
    return NextResponse.json({ error: 'Could not load dashboard data.' }, { status: 500 });
  }

  const executionProgress = await Promise.all((recentRuns.data ?? []).map(async (run) => {
    const { data: executions, error } = await supabase
      .from('test_executions')
      .select('status')
      .eq('test_run_id', run.id);

    if (error) return { id: run.id, name: run.name, progress: null, total: 0 };
    const total = executions?.length ?? 0;
    const completed = executions?.filter((execution) => execution.status !== 'not_run').length ?? 0;
    return {
      id: run.id,
      name: run.name,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      total,
    };
  }));

  const passed = passedExecutions.count ?? 0;
  const failed = failedExecutions.count ?? 0;
  const completedExecutionCount = passed + failed;

  return NextResponse.json({
    stats: {
      projectCount: projects.count ?? 0,
      requirementCount: requirements.count ?? 0,
      testCaseCount: testCases.count ?? 0,
      passRate: completedExecutionCount > 0 ? Math.round((passed / completedExecutionCount) * 100) : null,
      openDefectCount: openDefects.count ?? 0,
      criticalDefectCount: criticalDefects.count ?? 0,
    },
    executionProgress,
    recentDefects: recentDefects.data ?? [],
  });
}
