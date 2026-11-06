import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

function createRequestSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
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
}

export async function GET() {
  const supabase = createRequestSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select('role, organization:organizations(*)')
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Could not load organizations.' }, { status: 500 });
  }

  return NextResponse.json({ organizations: memberships ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createRequestSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json({ error: 'An email address is required to create an organization.' }, { status: 400 });
  }

  let body: { name?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';

  if (!name || name.length > 255) {
    return NextResponse.json({ error: 'Enter an organization name up to 255 characters.' }, { status: 400 });
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    return NextResponse.json({ error: 'Use a slug with lowercase letters, numbers, and single hyphens.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Organization setup is unavailable: configure SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const fullName = String(
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'QA User'
  ).trim();

  // Auth-created users may not have a matching profile row yet. The service role
  // can safely bootstrap that row and the first organization membership.
  const { error: profileError } = await admin.from('profiles').upsert(
    { id: user.id, email: user.email, full_name: fullName },
    { onConflict: 'id' }
  );

  if (profileError) {
    return NextResponse.json({ error: `Could not prepare your profile: ${profileError.message}` }, { status: 500 });
  }

  const { data: organization, error: organizationError } = await admin
    .from('organizations')
    .insert({ name, slug })
    .select()
    .single();

  if (organizationError || !organization) {
    const duplicate = organizationError?.code === '23505';
    return NextResponse.json(
      { error: duplicate ? 'That organization slug is already in use.' : organizationError?.message || 'Could not create organization.' },
      { status: duplicate ? 409 : 400 }
    );
  }

  const { error: membershipError } = await admin.from('organization_members').insert({
    organization_id: organization.id,
    user_id: user.id,
    role: 'org_admin',
  });

  if (membershipError) {
    // Avoid leaving an organization with no administrator if membership setup fails.
    await admin.from('organizations').delete().eq('id', organization.id);
    return NextResponse.json({ error: `Could not add you as organization admin: ${membershipError.message}` }, { status: 500 });
  }

  return NextResponse.json({ organization }, { status: 201 });
}
