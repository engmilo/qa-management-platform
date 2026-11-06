import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  let query = supabase.from('requirements').select('*').order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data: requirements, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requirements });
}

export async function POST(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const reqKey = typeof body.reqKey === 'string' ? body.reqKey.trim().toUpperCase() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!projectId || !reqKey || !title) {
    return NextResponse.json({ error: 'Project, requirement key, and title are required.' }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (projectError || !project) {
    return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });
  }

  const validPriorities = ['low', 'medium', 'high', 'critical'];
  const validStatuses = ['draft', 'under_review', 'approved', 'implemented', 'verified', 'rejected'];
  const validTypes = ['functional', 'non_functional', 'business', 'performance', 'security'];
  const priority = typeof body.priority === 'string' && validPriorities.includes(body.priority) ? body.priority : 'medium';
  const status = typeof body.status === 'string' && validStatuses.includes(body.status) ? body.status : 'draft';
  const type = typeof body.type === 'string' && validTypes.includes(body.type) ? body.type : 'functional';

  const { data: requirement, error } = await supabase.from('requirements').insert([{
    project_id: project.id,
    organization_id: project.organization_id,
    req_key: reqKey,
    title,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    priority,
    status,
    type,
    owner_id: user.id,
  }] as any).select().single();

  if (error) {
    return NextResponse.json(
      { error: error.code === '23505' ? 'That requirement key is already used in this project.' : error.message },
      { status: error.code === '23505' ? 409 : 400 }
    );
  }

  return NextResponse.json({ requirement }, { status: 201 });
}
