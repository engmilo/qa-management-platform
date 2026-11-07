import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

const OPEN_DEFECT_STATUSES = new Set(['new', 'open', 'in_progress', 'ready_for_retest', 'reopened']);

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get('projectId');
  let requirementsQuery = supabase
    .from('requirements')
    .select('id, project_id, req_key, title, status')
    .order('created_at', { ascending: false });

  if (projectId) requirementsQuery = requirementsQuery.eq('project_id', projectId);

  const { data: requirements, error: requirementsError } = await requirementsQuery;
  if (requirementsError) {
    return NextResponse.json({ error: 'Could not load requirements for the traceability matrix.' }, { status: 500 });
  }

  if (!requirements?.length) {
    return NextResponse.json({ requirements: [], summary: { totalRequirements: 0, coveredRequirements: 0, coveragePercentage: 0, openDefects: 0 } });
  }

  const requirementIds = requirements.map((requirement) => requirement.id);
  const projectIds = [...new Set(requirements.map((requirement) => requirement.project_id))];
  const [linksResult, projectsResult] = await Promise.all([
    supabase
      .from('test_case_requirements')
      .select('requirement_id, test_case_id')
      .in('requirement_id', requirementIds),
    supabase
      .from('projects')
      .select('id, name')
      .in('id', projectIds),
  ]);

  if (linksResult.error || projectsResult.error) {
    return NextResponse.json({ error: 'Could not load requirement links for the traceability matrix.' }, { status: 500 });
  }

  const links = linksResult.data ?? [];
  const linkedTestCaseIds = [...new Set(links.map((link) => link.test_case_id))];
  type TraceabilityTestCase = { id: string; project_id: string; case_key: string; title: string };
  type TraceabilityDefect = { id: string; test_case_id: string | null; status: string };
  let testCases: TraceabilityTestCase[] = [];
  let defects: TraceabilityDefect[] = [];

  if (linkedTestCaseIds.length) {
    const [testCasesResult, defectsResult] = await Promise.all([
      supabase
        .from('test_cases')
        .select('id, project_id, case_key, title')
        .in('id', linkedTestCaseIds),
      supabase
        .from('defects')
        .select('id, test_case_id, status')
        .in('test_case_id', linkedTestCaseIds),
    ]);

    if (testCasesResult.error || defectsResult.error) {
      return NextResponse.json({ error: 'Could not load linked test cases and defects.' }, { status: 500 });
    }

    testCases = testCasesResult.data ?? [];
    defects = defectsResult.data ?? [];
  }

  const projectsById = new Map((projectsResult.data ?? []).map((project) => [project.id, project.name] as const));
  const testCasesById = new Map(testCases.map((testCase) => [testCase.id, testCase] as const));
  const openDefectIdsByTestCaseId = new Map<string, Set<string>>();
  const allOpenDefectIds = new Set<string>();

  for (const defect of defects) {
    if (defect.test_case_id && OPEN_DEFECT_STATUSES.has(defect.status)) {
      const ids = openDefectIdsByTestCaseId.get(defect.test_case_id) ?? new Set<string>();
      ids.add(defect.id);
      openDefectIdsByTestCaseId.set(defect.test_case_id, ids);
    }
  }

  const traceabilityRows = requirements.map((requirement) => {
    const testCases = links
      .filter((link) => link.requirement_id === requirement.id)
      .flatMap((link) => {
        const testCase = testCasesById.get(link.test_case_id);
        // Ignore accidental cross-project links so the matrix never joins unrelated project data.
        if (!testCase || testCase.project_id !== requirement.project_id) return [];
        return [{ id: testCase.id, key: testCase.case_key, title: testCase.title }];
      });
    const testCaseIds = new Set(testCases.map((testCase) => testCase.id));
    const openDefectIds = new Set<string>();
    for (const testCaseId of testCaseIds) {
      for (const defectId of openDefectIdsByTestCaseId.get(testCaseId) ?? []) {
        openDefectIds.add(defectId);
        allOpenDefectIds.add(defectId);
      }
    }

    return {
      id: requirement.id,
      projectId: requirement.project_id,
      key: requirement.req_key,
      title: requirement.title,
      status: requirement.status,
      projectName: projectsById.get(requirement.project_id) ?? 'Project',
      testCases,
      openDefects: openDefectIds.size,
    };
  });

  const coveredRequirements = traceabilityRows.filter((row) => row.testCases.length > 0).length;
  const openDefects = allOpenDefectIds.size;

  return NextResponse.json({
    requirements: traceabilityRows,
    summary: {
      totalRequirements: traceabilityRows.length,
      coveredRequirements,
      coveragePercentage: Math.round((coveredRequirements / traceabilityRows.length) * 100),
      openDefects,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}

async function getLinkContext(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let body: { requirementId?: unknown; testCaseId?: unknown };
  try {
    body = await request.json();
  } catch {
    return { response: NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }) };
  }

  const requirementId = typeof body.requirementId === 'string' ? body.requirementId : '';
  const testCaseId = typeof body.testCaseId === 'string' ? body.testCaseId : '';
  if (!requirementId || !testCaseId) {
    return { response: NextResponse.json({ error: 'Requirement and test case are required.' }, { status: 400 }) };
  }

  const [requirementResult, testCaseResult] = await Promise.all([
    supabase.from('requirements').select('id, project_id').eq('id', requirementId).maybeSingle(),
    supabase.from('test_cases').select('id, project_id').eq('id', testCaseId).maybeSingle(),
  ]);

  if (requirementResult.error || testCaseResult.error || !requirementResult.data || !testCaseResult.data) {
    return { response: NextResponse.json({ error: 'Choose records you can access.' }, { status: 400 }) };
  }
  if (requirementResult.data.project_id !== testCaseResult.data.project_id) {
    return { response: NextResponse.json({ error: 'Requirements can only be linked to test cases in the same project.' }, { status: 400 }) };
  }

  return { supabase, requirementId, testCaseId };
}

export async function POST(request: NextRequest) {
  const context = await getLinkContext(request);
  if ('response' in context) return context.response;

  const { error } = await context.supabase.from('test_case_requirements').insert({
    requirement_id: context.requirementId,
    test_case_id: context.testCaseId,
  });

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: 'Could not link this test case to the requirement.' }, { status: 500 });
  }
  return NextResponse.json({ linked: true });
}

export async function DELETE(request: NextRequest) {
  const context = await getLinkContext(request);
  if ('response' in context) return context.response;

  const { error } = await context.supabase
    .from('test_case_requirements')
    .delete()
    .eq('requirement_id', context.requirementId)
    .eq('test_case_id', context.testCaseId);

  if (error) {
    return NextResponse.json({ error: 'Could not unlink this test case from the requirement.' }, { status: 500 });
  }
  return NextResponse.json({ linked: false });
}
