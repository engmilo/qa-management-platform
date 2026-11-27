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
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceRoleKeyIsPlaceholder = !serviceRoleKey || /^(your|example|placeholder|replace|insert|put|change)[-_ ]/i.test(serviceRoleKey);
  if (!supabaseUrl || serviceRoleKeyIsPlaceholder) {
    return NextResponse.json(
      { error: 'Set a real SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) in .env.local, then restart the dev server to load organization members.' },
      { status: 503 }
    );
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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const membershipQuery = supabase.from('organization_members') as any;
  const { data: membership, error: membershipError } = await membershipQuery
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
    return NextResponse.json({ error: 'Only organization admins can view members.' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceRoleKeyIsPlaceholder = !serviceRoleKey || /^(your|example|placeholder|replace|insert|put|change)[-_ ]/i.test(serviceRoleKey);
  if (!supabaseUrl || serviceRoleKeyIsPlaceholder) {
    return NextResponse.json({ error: 'Member management is unavailable: configure a real SUPABASE_SECRET_KEY on the server.' }, { status: 503 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: rows, error: membersError } = await (admin.from('organization_members') as any)
    .select('user_id, role')
    .eq('organization_id', params.id);

  if (membersError) {
    return NextResponse.json({ error: 'Could not load organization members.' }, { status: 500 });
  }

  const memberships = (rows ?? []) as Array<{ user_id: string; role: string }>;
  if (memberships.length === 0) {
    return NextResponse.json({ members: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const { data: profiles, error: profilesError } = await (admin.from('profiles') as any)
    .select('id, email, full_name')
    .in('id', memberships.map((item) => item.user_id));

  if (profilesError) {
    return NextResponse.json({ error: 'Could not load member profiles.' }, { status: 500 });
  }

  const profileById = new Map<string, { id: string; email: string; full_name: string | null }>();
  for (const profile of (profiles ?? []) as Array<{ id: string; email: string; full_name: string | null }>) {
    profileById.set(profile.id, profile);
  }

  const members = memberships.map((item) => {
    const profile = profileById.get(item.user_id);
    return {
      userId: item.user_id,
      role: item.role,
      email: profile?.email ?? '',
      fullName: profile?.full_name || profile?.email || 'Unknown user',
      isCurrentUser: item.user_id === user.id,
    };
  });

  return NextResponse.json({ members }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const membershipQuery = supabase.from('organization_members') as any;
  const { data: membership, error: membershipError } = await membershipQuery
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
    return NextResponse.json({ error: 'Only organization admins can deactivate members.' }, { status: 403 });
  }

  let body: { userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId) {
    return NextResponse.json({ error: 'A member user ID is required.' }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json({ error: 'You cannot deactivate your own organization access.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceRoleKeyIsPlaceholder = !serviceRoleKey || /^(your|example|placeholder|replace|insert|put|change)[-_ ]/i.test(serviceRoleKey);
  if (!supabaseUrl || serviceRoleKeyIsPlaceholder) {
    return NextResponse.json({ error: 'Member management is unavailable: configure a real SUPABASE_SECRET_KEY on the server.' }, { status: 503 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const adminMembershipQuery = admin.from('organization_members') as any;
  const { data: target, error: targetError } = await adminMembershipQuery
    .select('user_id, role')
    .eq('organization_id', params.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: 'Could not look up that organization member.' }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: 'That user is not a member of this organization.' }, { status: 404 });
  }
  if (target.role === 'org_admin' || target.role === 'super_admin') {
    return NextResponse.json({ error: 'Organization administrators cannot be deactivated.' }, { status: 403 });
  }

  const { error: deactivateError } = await adminMembershipQuery
    .delete()
    .eq('organization_id', params.id)
    .eq('user_id', userId);
  if (deactivateError) {
    return NextResponse.json({ error: 'Could not deactivate this organization member.' }, { status: 500 });
  }

  return NextResponse.json({ deactivated: true, userId });
}
