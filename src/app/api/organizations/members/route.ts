import { NextResponse } from 'next/server';
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