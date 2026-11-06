import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

const reportTables = {
  projects: 'projects',
  requirements: 'requirements',
  testCases: 'test_cases',
  testPlans: 'test_plans',
  testRuns: 'test_runs',
  defects: 'defects',
} as const;

export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const kind = request.nextUrl.searchParams.get('type') as keyof typeof reportTables | null;
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!kind || !Object.prototype.hasOwnProperty.call(reportTables, kind)) {
    return NextResponse.json({ error: 'Select a supported report type.' }, { status: 400 });
  }

  let query: any;
  switch (kind) {
    case 'projects':
      query = supabase.from('projects').select('*').order('created_at', { ascending: false });
      break;
    case 'requirements':
      query = supabase.from('requirements').select('*').order('created_at', { ascending: false });
      break;
    case 'testCases':
      query = supabase.from('test_cases').select('*').order('created_at', { ascending: false });
      break;
    case 'testPlans':
      query = supabase.from('test_plans').select('*').order('created_at', { ascending: false });
      break;
    case 'testRuns':
      query = supabase.from('test_runs').select('*').order('started_at', { ascending: false });
      break;
    case 'defects':
      query = supabase.from('defects').select('*').order('created_at', { ascending: false });
      break;
  }

  if (projectId) {
    query = kind === 'projects' ? query.eq('id', projectId) : query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not generate this report.' }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}
