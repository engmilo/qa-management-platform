import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createRouteSupabaseClient } from "@/lib/supabase/route-client";

function hashKey(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keyId = params.id;

    // 1. Load old key K1
    const { data: oldKey, error: fetchError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("id", keyId)
      .single();

    if (fetchError || !oldKey) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    // 2. Owner check, this was the 403 before
    // Settings keys use created_by, REQ-107 keys use user_id, check both
    const ownerId = (oldKey as any).user_id || (oldKey as any).created_by;
    if (ownerId && ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if ((oldKey as any).status === "grace" || (oldKey as any).revoked_at) {
      return NextResponse.json(
        { error: "Key already rotated or revoked" },
        { status: 400 }
      );
    }

    // 3. Generate new key K2, same format as Settings: qa_ + random
    const rawNewKey = "qa_" + randomBytes(24).toString("base64url");
    const newHash = hashKey(rawNewKey);
    const keyPrefix = rawNewKey.slice(0, 12);
    const last4 = rawNewKey.slice(-4);
    const graceEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const oldName = (oldKey as any).name || "API Key";
    const oldScopes = (oldKey as any).scopes || ["runs:write"];

    // 4. Create K2
    // FIX for 500: must set name + key_prefix + key_last4 + prefix + last_4
    // otherwise NOT NULL fails in this table
    const { data: newKey, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        organization_id: (oldKey as any).organization_id,
        user_id: user.id,
        created_by: user.id,
        created_by_email: user.email || "",
        name: `${oldName} - rotated`,
        key_hash: newHash,
        key_prefix: keyPrefix,
        prefix: keyPrefix,
        key_last4: last4,
        last_4: last4,
        scopes: oldScopes,
        status: "active",
        is_active: true,
      })
      .select("id, name, key_prefix, key_last4, last_4, status, created_at")
      .single();

    if (insertError || !newKey) {
      return NextResponse.json(
        {
          error: "Could not create new key",
          detail: insertError?.message || null,
        },
        { status: 500 }
      );
    }

    // 5. Put K1 into 24h grace, do not revoke yet
    const { error: updateError } = await supabase
      .from("api_keys")
      .update({
        status: "grace",
        grace_ends_at: graceEndsAt,
      })
      .eq("id", oldKey.id);

    if (updateError) {
      return NextResponse.json(
        {
          error: "Could not update old key to grace",
          detail: updateError.message,
        },
        { status: 500 }
      );
    }

    // 6. Audit log, do not fail rotate if audit table has different columns
    try {
      await supabase.from("api_key_audit_log").insert({
        organization_id: (oldKey as any).organization_id,
        user_id: user.id,
        api_key_id: oldKey.id,
        action: "rotated",
        details: {
          old_key_id: oldKey.id,
          new_key_id: (newKey as any).id,
          grace_ends_at: graceEndsAt,
        },
      });
    } catch {
      // audit is best-effort, rotate already succeeded
    }

    // 7. Return new key once, plus grace for old key
    return NextResponse.json(
      {
        new_key: rawNewKey,
        new_key_id: (newKey as any).id,
        new_key_prefix: keyPrefix,
        new_key_last_4: last4,
        old_key_id: oldKey.id,
        old_key_status: "grace",
        grace_ends_at: graceEndsAt,
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "Could not rotate key", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}