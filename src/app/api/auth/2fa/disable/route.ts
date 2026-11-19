import { NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

// DELETE /api/auth/2fa/disable — Disable 2FA for the current user
// Deletes the user_2fa row so next login goes straight to Dashboard, no code asked.
// v2: verifies a row was actually deleted — if RLS blocks DELETE, Supabase returns
// ok with 0 rows, so we must check the deleted count, not just error.
export async function DELETE() {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: deleted, error } = await supabase
    .from('user_2fa')
    .delete()
    .eq('user_id', user.id)
    .select('user_id');

  if (error) {
    console.error('[DELETE /api/auth/2fa/disable]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If RLS blocks DELETE, Supabase returns ok with 0 rows — treat that as failure
  // so the UI does NOT show "Disabled" when the DB still has the row.
  if (!deleted || deleted.length === 0) {
    console.error('[DELETE /api/auth/2fa/disable] 0 rows deleted — RLS DELETE policy missing for user_2fa');
    return NextResponse.json(
      { error: 'Could not disable 2FA — delete blocked. Run the RLS DELETE policy for user_2fa in Supabase SQL Editor.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, is_enabled: false });
}
