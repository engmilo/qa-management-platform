import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Orgs this user belongs to — anon client, RLS-safe
  const { data: myMemberships } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id);
  const orgIds = [...new Set((myMemberships ?? []).map((m: any) => m.organization_id))];
  if (!orgIds.length) return NextResponse.json({ members: [] });

  // 2. Members in those orgs
  const { data: members } = await supabase.from('organization_members').select('user_id, organization_id, role').in('organization_id', orgIds);
  const userIds = [...new Set((members ?? []).map((m: any) => m.user_id))];
  if (!userIds.length) return NextResponse.json({ members: [] });

  // 3. Names — try service-role first (bypasses profiles RLS, same as organizations POST)
  //    Falls back to anon profiles query if no service key.
  const nameById = new Map<string, { full_name: string | null; email: string | null }>();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  let usedAdmin = false;

  if (supabaseUrl && serviceKey) {
    try {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      // Profiles first
      const { data: profiles } = await admin.from('profiles').select('id, email, full_name').in('id', userIds);
      (profiles ?? []).forEach((p: any) => nameById.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null }));
      // Auth metadata as backup — this is where "Zam..." in your header comes from
      // even if no profiles row exists
      const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
      (listed?.users ?? []).forEach((u: any) => {
        if (!userIds.includes(u.id)) return;
        const existing = nameById.get(u.id);
        const metaName = u.user_metadata?.full_name || u.user_metadata?.name || null;
        if (!existing || !existing.full_name) {
          nameById.set(u.id, { full_name: metaName || existing?.full_name || null, email: u.email || existing?.email || null });
        }
      });
      usedAdmin = true;
    } catch {}
  }

  if (!usedAdmin) {
    const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', userIds);
    (profiles ?? []).forEach((p: any) => nameById.set(p.id, { full_name: p.full_name ?? null, email: p.email ?? null }));
  }

  const out = (members ?? []).map((m: any) => {
    const p = nameById.get(m.user_id);
    return {
      user_id: m.user_id,
      organization_id: m.organization_id,
      role: m.role,
      full_name: p?.full_name || null,
      email: p?.email || null,
      displayName: p?.full_name || p?.email || 'Assigned',
    };
  });

  return NextResponse.json({ members: out });
}

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { email?: unknown; role?: unknown; organization_id?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = typeof body.role === 'string' ? body.role : 'qa_engineer';
  const allowed = ['super_admin', 'org_admin', 'qa_manager', 'qa_engineer', 'developer', 'viewer'];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  // Which org? Use body organization_id if given, otherwise first org where you are admin, otherwise your first org.
  // You have only Zamir Oy now, so this will be Zamir Oy.
  const { data: myMemberships } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id);
  if (!myMemberships?.length) {
    return NextResponse.json({ error: 'You do not belong to an organization.' }, { status: 403 });
  }
  const orgIdFromBody = typeof body.organization_id === 'string' ? body.organization_id : '';
  const organizationId = orgIdFromBody
    || (myMemberships as any[]).find((m) => ['org_admin', 'super_admin'].includes(m.role))?.organization_id
    || (myMemberships as any[])[0].organization_id;

  const isAdmin = (myMemberships as any[]).some((m) => m.organization_id === organizationId && ['org_admin', 'super_admin'].includes(m.role));
  if (!isAdmin) {
    return NextResponse.json({ error: 'Only org admins can invite members.' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Invite is unavailable: configure SUPABASE_SECRET_KEY on the server.' }, { status: 503 });
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Lookup target in profiles
  let target: { id: string; email: string | null; full_name: string | null } | null = null;
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .ilike('email', email)
    .maybeSingle();
  if (profile) target = profile as any;

  // Fallback: exists in Auth but no profiles row yet (like your first Mailo Add user) -> bootstrap profiles
  if (!target) {
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    const authUser = (listed?.users ?? []).find((u: any) => (u.email || '').toLowerCase() === email);
    if (authUser) {
      const fullName = String(authUser.user_metadata?.full_name || authUser.user_metadata?.display_name || authUser.user_metadata?.name || email.split('@')[0] || 'Member').trim();
      await admin.from('profiles').upsert({ id: authUser.id, email: authUser.email, full_name: fullName }, { onConflict: 'id' });
      target = { id: authUser.id, email: authUser.email, full_name: fullName };
    }
  }

  if (!target) {
    return NextResponse.json({ error: 'User must be registered.' }, { status: 404 });
  }

  const { data: existing } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', target.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'User is already a member.' }, { status: 409 });
  }

  const { error: insertError } = await admin
    .from('organization_members')
    .insert({ organization_id: organizationId, user_id: target.id, role });
  if (insertError) {
    return NextResponse.json({ error: `Could not invite: ${insertError.message}` }, { status: 500 });
  }

  return NextResponse.json({ member: { user_id: target.id, email: target.email, full_name: target.full_name, role, organization_id: organizationId } }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const userId = typeof body.user_id === 'string' ? body.user_id : '';
  const role = typeof body.role === 'string' ? body.role : '';
  const organizationId = typeof body.organization_id === 'string' ? body.organization_id : '';
  const allowed = ['super_admin', 'org_admin', 'qa_manager', 'qa_engineer', 'developer', 'viewer'];
  if (!userId || !organizationId || !allowed.includes(role)) {
    return NextResponse.json({ error: 'Invalid user, organization, or role.' }, { status: 400 });
  }

  const { data: myMemberships } = await supabase.from('organization_members').select('organization_id, role').eq('user_id', user.id);
  const isAdmin = (myMemberships ?? []).some((m: any) => m.organization_id === organizationId && ['org_admin', 'super_admin'].includes(m.role));
  if (!isAdmin) return NextResponse.json({ error: 'Only org admins can change roles.' }, { status: 403 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Role change unavailable: configure SUPABASE_SECRET_KEY.' }, { status: 503 });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { error } = await admin.from('organization_members').update({ role }).eq('organization_id', organizationId).eq('user_id', userId);
  if (error) return NextResponse.json({ error: `Could not change role: ${error.message}` }, { status: 500 });
  return NextResponse.json({ ok: true });
}