// src/app/api/api-keys/route.ts
// REQ-PROD-002 API Keys — TC-PROD-006 to 010
// GET: list keys for caller's org (no full key ever returned)
// POST: only Org Admin can create. Returns full key ONCE.
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'crypto';

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

async function getCallerOrg(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, orgId: null, role: null };
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  return { user, orgId: member?.organization_id || null, role: (member?.role || '').toLowerCase() };
}

export async function GET() {
  const supabase = await getSupabase();
  const { user, orgId } = await getCallerOrg(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!orgId) return NextResponse.json({ api_keys: [] });
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_by_email, is_active, revoked_at, last_used_at, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ api_keys: data || [] });
}

export async function POST(req: Request) {
  const supabase = await getSupabase();
  const { user, orgId, role } = await getCallerOrg(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const isOrgAdmin = ['org_admin', 'super_admin', 'admin'].includes(role || '');
  if (!isOrgAdmin) return NextResponse.json({ error: 'Only Org Admin can create API keys.' }, { status: 403 });
  if (!orgId) return NextResponse.json({ error: 'No organization found.' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Key name is required.' }, { status: 400 });

  // Generate: qa_ + 32 random chars. Store only SHA-256 hash.
  const fullKey = `qa_${randomBytes(24).toString('base64url')}`;
  const keyHash = createHash('sha256').update(fullKey).digest('hex');
  const keyPrefix = fullKey.slice(0, 10) + '...';

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      organization_id: orgId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      created_by: user.id,
      created_by_email: user.email || '',
      is_active: true,
    })
    .select('id, name, key_prefix, created_by_email, is_active, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Full key returned ONLY here, never again
  return NextResponse.json({ api_key: data, full_key: fullKey });
}
