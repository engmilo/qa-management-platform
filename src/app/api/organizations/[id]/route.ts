import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

const assignableRoles = ['qa_manager', 'qa_engineer', 'developer', 'viewer'] as const;
type AssignableRole = typeof assignableRoles[number];

function createRequestSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
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
}

async function getMembershipContext(organizationId: string) {
  const supabase = createRequestSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }

  const membershipQuery = supabase.from('organization_members') as any;
  const { data: membership, error: membershipError } = await membershipQuery
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    return { response: NextResponse.json({ error: 'Could not verify your organization access.' }, { status: 500 }) } as const;
  }
  if (!membership) {
    return { response: NextResponse.json({ error: 'Organization not found.' }, { status: 404 }) } as const;
  }

  return { supabase, user, role: membership.role } as const;
}

async function getAdminContext(organizationId: string) {
  const context = await getMembershipContext(organizationId);
  if ('response' in context) return context;
  if (context.role !== 'org_admin' && context.role !== 'super_admin') {
    return { response: NextResponse.json({ error: 'Only organization admins can manage members.' }, { status: 403 }) } as const;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { response: NextResponse.json({ error: 'Member management is unavailable: configure SUPABASE_SERVICE_ROLE_KEY on the server.' }, { status: 503 }) } as const;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { ...context, admin } as const;
}

async function findAuthUserByEmail(admin: any, email: string) {
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return { user: null, error };
    const user = data.users.find((candidate: { email?: string }) => candidate.email?.toLowerCase() === email);
    if (user) return { user, error: null };
    if (data.users.length < perPage) return { user: null, error: null };
  }
  return { user: null, error: new Error('Could not search all Auth users. Contact an administrator.') };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getMembershipContext(params.id);
  if ('response' in context) return context.response;
  if (context.role !== 'org_admin' && context.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only organization admins can update settings.' }, { status: 403 });
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 255) {
    return NextResponse.json({ error: 'Enter an organization name up to 255 characters.' }, { status: 400 });
  }

  const organizationQuery = context.supabase.from('organizations') as any;
  const { data: organization, error } = await organizationQuery
    .update({ name })
    .eq('id', params.id)
    .select('id, name, slug')
    .single();

  if (error || !organization) {
    return NextResponse.json({ error: error?.message || 'Could not update organization settings.' }, { status: 400 });
  }
  return NextResponse.json({ organization });
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getAdminContext(params.id);
  if (!('admin' in context)) return context.response;

  const membershipQuery = context.admin.from('organization_members') as any;
  const { data: rows, error: membersError } = await membershipQuery
    .select('user_id, role, created_at')
    .eq('organization_id', params.id)
    .order('created_at', { ascending: true });

  if (membersError) {
    return NextResponse.json({ error: 'Could not load organization members.' }, { status: 500 });
  }
  if (!rows?.length) return NextResponse.json({ members: [] }, { headers: { 'Cache-Control': 'no-store' } });

  const memberships = rows as Array<{ user_id: string; role: string; created_at: string }>;
  const profileQuery = context.admin.from('profiles') as any;
  const { data: profiles, error: profilesError } = await profileQuery
    .select('id, email, full_name')
    .in('id', memberships.map((member) => member.user_id));

  if (profilesError) {
    return NextResponse.json({ error: 'Could not load member profiles.' }, { status: 500 });
  }

  const profileById = new Map<string, { id: string; email: string; full_name: string }>();
  for (const profile of (profiles ?? []) as Array<{ id: string; email: string; full_name: string }>) {
    profileById.set(profile.id, profile);
  }
  const members = memberships.map((member) => {
    const profile = profileById.get(member.user_id);
    return {
      userId: member.user_id,
      role: member.role,
      createdAt: member.created_at,
      email: profile?.email ?? '',
      fullName: profile?.full_name ?? 'Unknown user',
    };
  });

  return NextResponse.json({ members }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getAdminContext(params.id);
  if (!('admin' in context)) return context.response;

  let body: { email?: unknown; fullName?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const requestedName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const fullName = requestedName || email.split('@')[0] || '';
  const role = typeof body.role === 'string' ? body.role : 'qa_engineer';

  if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (fullName.length > 255) {
    return NextResponse.json({ error: 'Enter a name up to 255 characters.' }, { status: 400 });
  }
  if (!assignableRoles.includes(role as AssignableRole)) {
    return NextResponse.json({ error: 'Choose a valid organization role.' }, { status: 400 });
  }

  const profileQuery = context.admin.from('profiles') as any;
  const { data: profile, error: profileLookupError } = await profileQuery
    .select('id, email, full_name')
    .eq('email', email)
    .maybeSingle();

  if (profileLookupError) {
    return NextResponse.json({ error: 'Could not look up that account.' }, { status: 500 });
  }

  let userId: string | undefined = profile?.id;
  let finalName = requestedName || profile?.full_name || fullName;
  let invitationSent = false;

  if (!userId) {
    const lookup = await findAuthUserByEmail(context.admin, email);
    if (lookup.error) {
      return NextResponse.json({ error: lookup.error.message || 'Could not look up that account.' }, { status: 500 });
    }

    if (lookup.user) {
      userId = lookup.user.id;
      finalName = requestedName || String(lookup.user.user_metadata?.full_name || lookup.user.user_metadata?.name || fullName).trim();
    } else {
      const redirectTo = new URL('/auth/update-password?mode=invite', request.url).toString();
      const { data: invitation, error: inviteError } = await context.admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: finalName },
        redirectTo,
      });
      if (inviteError || !invitation.user) {
        return NextResponse.json(
          { error: inviteError?.message || 'Could not send the invitation email.' },
          { status: inviteError?.status === 422 ? 409 : 400 }
        );
      }
      userId = invitation.user.id;
      invitationSent = true;
    }

    const upsertProfile = context.admin.from('profiles') as any;
    const { error: profileError } = await upsertProfile.upsert(
      { id: userId, email, full_name: finalName },
      { onConflict: 'id' }
    );
    if (profileError) {
      return NextResponse.json({ error: 'The account exists, but its profile could not be prepared.' }, { status: 500 });
    }
  }

  const memberQuery = context.admin.from('organization_members') as any;
  const { data: existingMembership, error: membershipLookupError } = await memberQuery
    .select('user_id')
    .eq('organization_id', params.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipLookupError) {
    return NextResponse.json({ error: 'Could not check existing organization access.' }, { status: 500 });
  }
  if (existingMembership) {
    return NextResponse.json({ error: 'That user already has access to this organization.' }, { status: 409 });
  }

  const { error: addError } = await context.admin.from('organization_members').insert({
    organization_id: params.id,
    user_id: userId,
    role,
  });

  if (addError) {
    return NextResponse.json({ error: 'Could not add this user to the organization.' }, { status: 500 });
  }

  return NextResponse.json({ member: { userId, email, fullName: finalName, role }, invitationSent }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await getAdminContext(params.id);
  if (!('admin' in context)) return context.response;

  let body: { userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId) return NextResponse.json({ error: 'A member user ID is required.' }, { status: 400 });
  if (userId === context.user.id) {
    return NextResponse.json({ error: 'You cannot deactivate your own organization access.' }, { status: 400 });
  }

  const memberQuery = context.admin.from('organization_members') as any;
  const { data: target, error: targetError } = await memberQuery
    .select('user_id, role')
    .eq('organization_id', params.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (targetError) return NextResponse.json({ error: 'Could not look up that organization member.' }, { status: 500 });
  if (!target) return NextResponse.json({ error: 'That user is not a member of this organization.' }, { status: 404 });

  if (target.role === 'org_admin' || target.role === 'super_admin') {
    const { data: admins, error: adminsError } = await memberQuery
      .select('user_id')
      .eq('organization_id', params.id)
      .in('role', ['org_admin', 'super_admin']);
    if (adminsError) return NextResponse.json({ error: 'Could not verify organization administrators.' }, { status: 500 });
    if ((admins ?? []).length <= 1) {
      return NextResponse.json({ error: 'You cannot deactivate the last organization administrator.' }, { status: 409 });
    }
  }

  const { error: deactivateError } = await memberQuery
    .delete()
    .eq('organization_id', params.id)
    .eq('user_id', userId);

  if (deactivateError) return NextResponse.json({ error: 'Could not deactivate this organization member.' }, { status: 500 });
  return NextResponse.json({ deactivated: true, userId });
}