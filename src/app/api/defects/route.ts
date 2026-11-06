import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

const severities = ['trivial', 'minor', 'major', 'critical', 'blocker'] as const;
const priorities = ['low', 'medium', 'high', 'critical'] as const;

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get('projectId');
  let query = supabase.from('defects').select('*').order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load defects.' }, { status: 500 });
  return NextResponse.json({ defects: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const defectKey = typeof body.defectKey === 'string' ? body.defectKey.trim().toUpperCase() : '';
  const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
  if (!projectId || !defectKey || !summary) {
    return NextResponse.json({ error: 'Project, defect key, and summary are required.' }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });

  const severity = typeof body.severity === 'string' && severities.includes(body.severity as typeof severities[number])
    ? body.severity : 'major';
  const priority = typeof body.priority === 'string' && priorities.includes(body.priority as typeof priorities[number])
    ? body.priority : 'medium';

  const { data: defect, error } = await supabase.from('defects').insert({
    project_id: project.id,
    organization_id: project.organization_id,
    defect_key: defectKey,
    summary,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    severity,
    priority,
    status: 'new',
    environment: typeof body.environment === 'string' ? body.environment.trim() || null : null,
    steps_to_reproduce: typeof body.stepsToReproduce === 'string' ? body.stepsToReproduce.trim() || null : null,
    expected_result: typeof body.expectedResult === 'string' ? body.expectedResult.trim() || null : null,
    actual_result: typeof body.actualResult === 'string' ? body.actualResult.trim() || null : null,
    reporter_id: user.id,
  }).select().single();

  if (error) {
    return NextResponse.json(
      { error: error.code === '23505' ? 'That defect key is already used in this project.' : error.message },
      { status: error.code === '23505' ? 409 : 400 }
    );
  }
  return NextResponse.json({ defect }, { status: 201 });
}
