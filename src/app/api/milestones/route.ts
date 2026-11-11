import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('milestones')
      .select('*, projects(name, key)')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ milestones: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load milestones.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name ?? '').toString().trim();
    const project_id = (body.project_id ?? '').toString().trim();
    if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    if (!project_id) return NextResponse.json({ error: 'Project is required.' }, { status: 400 });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('milestones')
      .insert({
        project_id,
        organization_id: body.organization_id || null,
        name,
        description: body.description || null,
        status: body.status || 'planned',
        due_date: body.due_date || null,
      })
      .select('*, projects(name, key)')
      .single();
    if (error) throw error;
    return NextResponse.json({ milestone: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not create milestone.' }, { status: 500 });
  }
}