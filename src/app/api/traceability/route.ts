import { NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

export async function GET() {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [
    { data: reqs },
    { data: cases },
    { data: links },
    { data: defects },
    { data: projects },
  ] = await Promise.all([
    supabase.from('requirements').select('*'),
    supabase.from('test_cases').select('*'),
    // FIX1: link lives in JOIN table, not in test_cases.requirement_id
    supabase.from('test_case_requirements').select('*'),
    supabase.from('defects').select('*'),
    supabase.from('projects').select('*'),
  ]);

  const allReqs = reqs ?? [];
  const allCases = cases ?? [];
  const allLinks = links ?? [];
  const allDefects = defects ?? [];
  const allProjects = projects ?? [];

  const caseById = new Map(allCases.map((c: any) => [String(c.id), c]));
  const projectById = new Map(allProjects.map((p: any) => [String(p.id), p]));

  const rows = allReqs.map((req: any) => {
    const reqId = String(req.id);
    // All test_case_ids linked to this requirement via join table
    const linkedCaseIds = allLinks
      .filter((l: any) => String(l.requirement_id) === reqId)
      .map((l: any) => String(l.test_case_id));
    const linkedCases = linkedCaseIds
      .map((id) => caseById.get(id))
      .filter(Boolean);
    const linkedSet = new Set(linkedCaseIds);

    // Defects: directly on requirement OR via a linked test case
    const linkedDefects = allDefects.filter((d: any) => {
      if (String(d.requirement_id ?? '') === reqId) return true;
      if (linkedSet.has(String(d.test_case_id ?? ''))) return true;
      return false;
    });

    const proj = projectById.get(String(req.project_id ?? ''));
    const project = proj?.name ?? proj?.title ?? req.project_name ?? 'General';

    return {
      id: req.id,
      code: req.req_key ?? req.code ?? req.key ?? req.id,
      title: req.title ?? req.name ?? '',
      project,
      projectId: req.project_id ?? null,
      testCases: linkedCases.length,
      testCaseList: linkedCases.map((c: any) => ({
        code: c.case_key ?? c.key ?? c.code ?? c.id,
        title: c.title ?? c.name ?? '',
      })),
      defects: linkedDefects.length,
      defectList: linkedDefects.map((d: any) => ({
        key: d.defect_key ?? d.key ?? d.code ?? d.id,
        summary: d.summary ?? d.title ?? '',
      })),
      coverage: linkedCases.length > 0 ? 'Covered' : 'Not Covered',
    };
  });

  const covered = rows.filter((r) => r.testCases > 0).length;
  const total = rows.length;
  const coveragePct = total > 0 ? Math.round((covered / total) * 100) : 0;
  return NextResponse.json({ rows, covered, total, coveragePct }, { headers: { 'Cache-Control': 'no-store' } });
}
