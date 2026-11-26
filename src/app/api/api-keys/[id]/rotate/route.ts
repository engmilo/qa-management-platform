import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import crypto from 'crypto';

function hashKey(rawKey: string) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function randomKey() {
  return 'sk-' + crypto.randomBytes(24).toString('hex');
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keyId = params.id;

    // 1. Load old key
    const { data: oldKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (fetchError || !oldKey) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    // 2. Owner check, this is what returned 403 before
    if (oldKey.user_id && oldKey.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If old key is already in grace or revoked, do not rotate again
    if (oldKey.status === 'grace' || oldKey.status === 'revoked') {
      return NextResponse.json(
        { error: 'Key already rotated or revoked' },
        { status: 400 }
      );
    }

    // 3. Generate new key K2
    const rawNewKey = randomKey();
    const newHash = hashKey(rawNewKey);
    const prefix = 'sk-test';
    const last4 = rawNewKey.slice(-4);
    const graceEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 4. Create new key K2
    // FIX for 500: this table requires name and key_prefix NOT NULL
    // Settings UI fills both automatically, SQL and rotate code must fill both too
    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        organization_id: oldKey.organization_id,
        user_id: user.id,
        name: `${oldKey.name} - rotated`,
        key_hash: newHash,
        key_prefix: prefix,
        prefix: prefix,
        last_4: last4,
        status: 'active',
        scopes: oldKey.scopes || ['runs:write'],
      })
      .select('id, name, key_prefix, prefix, last_4, status, created_at')
      .single();

    if (insertError || !newKey) {
      return NextResponse.json(
        { error: 'Could not create new key', detail: insertError?.message || null },
        { status: 500 }
      );
    }

    // 5. Put old key K1 into 24h grace
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({
        status: 'grace',
        grace_ends_at: graceEndsAt,
      })
      .eq('id', oldKey.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Could not update old key to grace', detail: updateError.message },
        { status: 500 }
      );
    }

    // 6. Audit log, records rotation for REQ-107
    await supabase.from('api_key_audit_log').insert({
      organization_id: oldKey.organization_id,
      user_id: user.id,
      api_key_id: oldKey.id,
      action: 'rotated',
      details: {
        old_key_id: oldKey.id,
        new_key_id: newKey.id,
        grace_ends_at: graceEndsAt,
      },
    });

    // 7. Return new key once, plus grace for old key
    return NextResponse.json(
      {
        new_key: rawNewKey,
        new_key_id: newKey.id,
        new_key_prefix: newKey.key_prefix,
        new_key_last_4: newKey.last_4,
        old_key_id: oldKey.id,
        old_key_status: 'grace',
        grace_ends_at: graceEndsAt,
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Could not rotate key', detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}