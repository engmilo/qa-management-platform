import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { createRouteSupabaseClient } from "@/lib/supabase/route-client";
import { requireOrgPermission, permissionError } from "@/lib/auth/require-org-permission";

function hashKey(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

async function getOrgAndCheck(supabase: any, userId: string) {
  // Org Admin only for API keys. Find org via membership.
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) throw new Error("No organization");
  await requireOrgPermission(supabase, userId, membership.organization_id, "canManageApiKeys");
  return membership.organization_id as string;
}

export async function GET(_req: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let organization_id: string;
  try {
    organization_id = await getOrgAndCheck(supabase, user.id);
  } catch (e) {
    const pe = permissionError(e);
    return NextResponse.json({ error: pe.message }, { status: pe.status });
  }
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, key_last4, scopes, created_at, expires_at, revoked_at, created_by")
    .eq("organization_id", organization_id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // Never return full key or hash. Only prefix / last4 + expiry.
  return NextResponse.json({ apiKeys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let organization_id: string;
  try {
    organization_id = await getOrgAndCheck(supabase, user.id);
  } catch (e) {
    const pe = permissionError(e);
    return NextResponse.json({ error: pe.message }, { status: pe.status });
  }
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Key name is required." }, { status: 400 });
  const scopes = Array.isArray(body.scopes) ? body.scopes.filter((s: any) => typeof s === "string") : [];
  if (!scopes.length) return NextResponse.json({ error: "Pick at least one scope." }, { status: 400 });
  let expires_at: string | null = null;
  if (body.expires_at) {
    const d = new Date(body.expires_at);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
    expires_at = d.toISOString();
  }
  const value = "qa_" + randomBytes(24).toString("base64url");
  const key_hash = hashKey(value);
  const key_prefix = value.slice(0, 12);
  const key_last4 = value.slice(-4);
  const { data, error } = await supabase
    .from("api_keys")
    .insert({ organization_id, name, key_hash, key_prefix, key_last4, scopes, expires_at, created_by: user.id })
    .select("id, name, key_prefix, key_last4, scopes, created_at, expires_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // Full value shown ONLY here, once. Never stored in plain text.
  return NextResponse.json({ apiKey: { ...data, value }, value });
}
