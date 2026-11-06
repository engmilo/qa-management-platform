import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
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

  const { name } = await request.json();

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // The hand-maintained Database type omits generated table metadata, so
  // Supabase infers this update as `never`; keep the cast scoped to this query.
  const organizationQuery = supabase.from('organizations') as any;
  const { data: org, error } = await organizationQuery
    .update({ name })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ organization: org });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
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

  const memberQuery = supabase.from('organization_members') as any;
  const { data: membership, error: membershipError } = await memberQuery
    .select('role')
    .eq('organization_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: 'Could not verify your organization access.' }, { status: 500 });
  }
  if (!membership) {
    return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
  }
  if (membership.role !== 'org_admin' && membership.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only organization admins can add members.' }, { status: 403 });
  }

  let body: { email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const allowedRoles = ['qa_manager', 'qa_engineer', 'developer', 'viewer'] as const;
  const role = typeof body.role === 'string' && allowedRoles.includes(body.role as typeof allowedRoles[number])
    ? body.role as typeof allowedRoles[number]
    : 'qa_engineer';

  if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address for an existing account.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Member management is unavailable: configure SUPABASE_SERVICE_ROLE_KEY on the server.' }, { status: 503 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: 'Could not look up that account.' }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'No registered account was found for that email. The person must register first.' }, { status: 404 });
  }

  const { error: addError } = await admin.from('organization_members').insert({
    organization_id: params.id,
    user_id: profile.id,
    role,
  });

  if (addError?.code === '23505') {
    return NextResponse.json({ error: 'That user is already a member of this organization.' }, { status: 409 });
  }
  if (addError) {
    return NextResponse.json({ error: `Could not add the member: ${addError.message}` }, { status: 500 });
  }

  return NextResponse.json({ member: { email, role } }, { status: 201 });
}
