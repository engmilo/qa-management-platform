import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

function hashKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: oldKey, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !oldKey) return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  if (oldKey.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (oldKey.status !== 'active') return NextResponse.json({ error: 'Only an active key can be rotated' }, { status: 409 });

  // Create new key, same org and owner as old
  const rawNewKey = `sk-${crypto.randomBytes(24).toString('hex')}`;
  const prefix = rawNewKey.slice(0, 7);
  const last4 = rawNewKey.slice(-4);

  const { data: newKey, error: insertError } = await supabase
    .from('api_keys')
    .insert({
      organization_id: oldKey.organization_id,
      user_id: user.id,
      key_hash: hashKey(rawNewKey),
      prefix,
      last_4: last4,
      status: 'active',
      rotated_from_id: oldKey.id,
    })
    .select('id, prefix, last_4, status, created_at')
    .single();

  if (insertError || !newKey) return NextResponse.json({ error: 'Could not create new key' }, { status: 500 });

  // Put old key in grace for 24h
  const graceEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('api_keys')
    .update({ status: 'grace', grace_ends_at: graceEndsAt, rotated_to_id: newKey.id })
    .eq('id', oldKey.id);

  // Audit log, never store full secret, only ids and prefix
  await supabase.from('api_key_audit_log').insert({
    organization_id: oldKey.organization_id,
    user_id: user.id,
    api_key_id: oldKey.id,
    action: 'api_key.rotated',
    old_key_id: oldKey.id,
    new_key_id: newKey.id,
  });

  // Return new key value ONCE. Frontend must show it once and never again.
  return NextResponse.json({ ...newKey, api_key: rawNewKey, grace_ends_at: graceEndsAt }, { status: 201 });
}