import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

export async function getCurrentUser() {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUserWithOrg() {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Get user organizations
  const { data: memberships } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization_id,
      organizations!inner(id, name, slug)
    `)
    .eq('user_id', user.id);

  return {
    user,
    organizations: memberships || [],
    currentOrg: memberships?.[0],
  };
}

export async function getUserOrganizationIds(userId: string) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId);

  return data?.map(m => m.organization_id) || [];
}
