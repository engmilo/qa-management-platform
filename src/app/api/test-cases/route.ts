import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get('projectId');
  let query = supabase.from('test_cases').select('*').order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load test cases.' }, { status: 500 });
  return NextResponse.json({ testCases: data ?? [] });
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
  const caseKey = typeof body.caseKey === 'string' ? body.caseKey.trim().toUpperCase() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!projectId || !caseKey || !title) {
    return NextResponse.json({ error: 'Project, test case key, and title are required.' }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });

  const { data: testCase, error } = await supabase.from('test_cases').insert({
    project_id: project.id,
    organization_id: project.organization_id,
    case_key: caseKey,
    title,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    preconditions: typeof body.preconditions === 'string' ? body.preconditions.trim() || null : null,
    priority: typeof body.priority === 'string' ? body.priority : 'medium',
    test_type: typeof body.testType === 'string' ? body.testType : 'functional',
    category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'General',
    automation_status: typeof body.automationStatus === 'string' ? body.automationStatus : 'manual',
    author_id: user.id,
  }).select().single();

  if (error) {
    return NextResponse.json(
      { error: error.code === '23505' ? 'That test case key is already used in this project.' : error.message },
      { status: error.code === '23505' ? 409 : 400 }
    );
  }
  return NextResponse.json({ testCase }, { status: 201 });
}
