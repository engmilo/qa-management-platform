import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import speakeasy from 'speakeasy';
import crypto from 'crypto';

// POST /api/auth/2fa/verify — Step 2 of REQ-PROD-001
// Body: { code: "123456" }
// Verifies the TOTP code against the stored secret, enables 2FA, generates recovery codes (shown once)
function makeRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    // e.g. A3F9-K7Q2 — easy to copy, hard to guess
    const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part()}-${part()}`);
  }
  return codes;
}

export async function POST(req: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const code = String(body.code ?? '').trim();
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter a 6-digit code.' }, { status: 400 });

  const { data: row, error: fetchErr } = await supabase
    .from('user_2fa')
    .select('secret, is_enabled')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchErr || !row || !(row as any).secret) {
    return NextResponse.json({ error: 'No 2FA setup found. Click Enable 2FA first.' }, { status: 400 });
  }

  const valid = speakeasy.totp.verify({
    secret: (row as any).secret as string,
    encoding: 'base32',
    token: code,
    window: 1, // allow 1 step (±30s) clock drift
  });

  if (!valid) return NextResponse.json({ error: 'Invalid code. Try again.' }, { status: 400 });

  const recoveryCodes = makeRecoveryCodes();

  const { error: updateErr } = await supabase
    .from('user_2fa')
    .update({
      is_enabled: true,
      recovery_codes: recoveryCodes,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (updateErr) {
    console.error('[POST /api/auth/2fa/verify]', updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Return recovery codes ONCE — frontend must show them and tell user to save them
  return NextResponse.json({ ok: true, recoveryCodes });
}
