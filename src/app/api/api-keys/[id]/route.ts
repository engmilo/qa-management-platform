import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/route-client";
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.json({ error: "No organization" }, { status: 403 });
  const role = String((membership as any).role || "").toLowerCase();
  if (role !== "org admin" && role !== "org_admin" && role !== "admin") return NextResponse.json({ error: "Forbidden: Org Admin only" }, { status: 403 });
  const organization_id = (membership as any).organization_id as string;
  const { data, error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", params.id).eq("organization_id", organization_id).is("revoked_at", null).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Key not found or already revoked." }, { status: 404 });
  return NextResponse.json({ revoked: true });
}
