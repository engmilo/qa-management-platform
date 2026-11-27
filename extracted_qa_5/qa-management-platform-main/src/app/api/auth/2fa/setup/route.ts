import { NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// POST /api/auth/2fa/setup — Step 1 of REQ-PROD-001 (speakeasy version, no otplib)
// Creates a TOTP secret, stores it as disabled, returns QR code for the authenticator app
export async function POST() {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const generated = speakeasy.generateSecret({
    length: 20,
    name: `QA Management Platform:${user.email ?? 'user'}`,
    issuer: 'QA Management Platform',
  });
  const secret = generated.base32; // store base32
  const otpauth = generated.otpauth_url ?? '';

  // Store secret as NOT enabled yet — it only becomes enabled after verify
  const { error } = await supabase.from('user_2fa').upsert(
    {
      user_id: user.id,
      secret,
      is_enabled: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.error('[POST /api/auth/2fa/setup]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const qrCode = await QRCode.toDataURL(otpauth);

  return NextResponse.json({ qrCode, otpauth, secret });
}
