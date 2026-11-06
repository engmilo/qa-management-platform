import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get('projectId');
  let query = supabase.from('test_plans').select('*').order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load test plans.' }, { status: 500 });
  return NextResponse.json({ testPlans: data ?? [] });
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
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!projectId || !title) {
    return NextResponse.json({ error: 'Project and test plan name are required.' }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });

  const { data: plan, error } = await supabase.from('test_plans').insert({
    project_id: project.id,
    organization_id: project.organization_id,
    title,
    scope: typeof body.scope === 'string' ? body.scope.trim() || null : null,
    start_date: typeof body.startDate === 'string' && body.startDate ? body.startDate : null,
    end_date: typeof body.endDate === 'string' && body.endDate ? body.endDate : null,
    status: typeof body.status === 'string' ? body.status : 'draft',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ testPlan: plan }, { status: 201 });
}
