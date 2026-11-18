import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import speakeasy from 'speakeasy';

// POST /api/auth/2fa/login-verify — Step 5 of REQ-PROD-001
// Body: { code: "123456" } — can be a 6-digit TOTP code OR a recovery code like "A3F9-K7Q2"
// Called AFTER password login, BEFORE letting user into Dashboard
export async function POST(req: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized — login with password first.' }, { status: 401 });

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const code = String(body.code ?? '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Enter a code.' }, { status: 400 });

  const { data: row } = await supabase
    .from('user_2fa')
    .select('secret, is_enabled, recovery_codes')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row || !(row as any).is_enabled) {
    // 2FA not enabled — no second factor needed
    return NextResponse.json({ ok: true, method: 'none' });
  }

  const secret = (row as any).secret as string;
  const recoveryCodes = ((row as any).recovery_codes ?? []) as string[];

  // Case 1: Recovery code (format XXXX-XXXX, contains a dash)
  if (code.includes('-')) {
    const idx = recoveryCodes.findIndex((c) => c.toUpperCase() === code);
    if (idx === -1) return NextResponse.json({ error: 'Invalid or already-used recovery code.' }, { status: 400 });

    // Burn the code — remove it so it can be used only once
    const remaining = [...recoveryCodes];
    remaining.splice(idx, 1);
    await supabase.from('user_2fa').update({ recovery_codes: remaining }).eq('user_id', user.id);
    return NextResponse.json({ ok: true, method: 'recovery', remaining: remaining.length });
  }

  // Case 2: 6-digit TOTP code
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter a 6-digit code or a recovery code.' }, { status: 400 });

  const valid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (!valid) return NextResponse.json({ error: 'Invalid code. Try again.' }, { status: 400 });

  return NextResponse.json({ ok: true, method: 'totp' });
}
