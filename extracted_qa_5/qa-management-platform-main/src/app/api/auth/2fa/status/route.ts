import { NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

// GET /api/auth/2fa/status — for Settings UI to show Enabled / Disabled
export async function GET() {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('user_2fa')
    .select('is_enabled')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({ is_enabled: (data as any)?.is_enabled ?? false });
}
