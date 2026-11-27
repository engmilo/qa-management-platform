import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entity_type = url.searchParams.get('entity_type');
  const entity_id = url.searchParams.get('entity_id');
  if (!entity_type || !entity_id) {
    return NextResponse.json({ error: 'entity_type and entity_id required' }, { status: 400 });
  }
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data || [] });
}

export async function POST(request: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await request.json().catch(() => ({}));
  const entity_type = String(body?.entity_type || '');
  const entity_id = String(body?.entity_id || '');
  const content = String(body?.content || '').trim();
  if (!['test_case', 'defect'].includes(entity_type) || !entity_id || !content) {
    return NextResponse.json({ error: 'entity_type, entity_id and content required' }, { status: 400 });
  }
  const email = user?.email || '';
  const author_name = (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.name || (email ? email.split('@')[0] : 'User');
  const { data, error } = await supabase
    .from('comments')
    .insert({
      entity_type,
      entity_id,
      author_id: user?.id || null,
      author_name,
      author_email: email || null,
      content,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}