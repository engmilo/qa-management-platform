// src/app/api/test-suites/[id]/route.ts — FIXED
// GET returns suite + cases from test_suite_cases (single source of truth)
// PATCH + PUT both work (frontend previously sent PUT, API only had PATCH -> 405 Save failed)
// DELETE keeps TC-PROD-010 scope check for API keys
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateApiKey } from '@/lib/api-key-auth';

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } },
  });
}

async function updateSuite(req: Request, id: string) {
  const body = await req.json().catch(() => ({}));
  const supabase = await getSupabase();
  const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || req.headers.get('authorization');
  if (apiKeyHeader) {
    const auth = await validateApiKey(req);
    if (!auth.valid) return NextResponse.json({ error: auth.error || 'Invalid or revoked API key' }, { status: 401 });
    const scopes = auth.scopes || [];
    if (!scopes.includes('suites:write') && !scopes.includes('*')) {
      return NextResponse.json({ error: `Forbidden: scope required: suites:write, key has only: ${scopes.join(', ') || 'none'}` }, { status: 403 });
    }
    const { data, error } = await supabase.from('test_suites').update({ name: body.name, description: body.description, updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', auth.organization_id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ suite: data, test_suite: data, data, ...data });
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data, error } = await supabase.from('test_suites').update({ name: body.name, description: body.description, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suite: data, test_suite: data, data, ...data });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabase();
  const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || req.headers.get('authorization');
  if (apiKeyHeader) {
    const auth = await validateApiKey(req);
    if (!auth.valid) return NextResponse.json({ error: auth.error || 'Invalid or revoked API key' }, { status: 401 });
    const scopes = auth.scopes || [];
    if (!scopes.includes('suites:read') && !scopes.includes('suites:write') && !scopes.includes('*')) {
      return NextResponse.json({ error: 'Forbidden: scope required: suites:read' }, { status: 403 });
    }
    const { data, error } = await supabase.from('test_suites').select('*').eq('id', id).eq('organization_id', auth.organization_id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    const { data: links } = await supabase.from('test_suite_cases').select('test_case_id, test_cases(id,case_key,title,priority,test_type)').eq('test_suite_id', id);
    const cases = (links ?? []).map((l: any) => l.test_cases).filter(Boolean);
    return NextResponse.json({ suite: data, test_suite: data, cases, data, ...data });
  }
  const { data, error } = await supabase.from('test_suites').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  const { data: links } = await supabase.from('test_suite_cases').select('test_case_id, test_cases(id,case_key,title,priority,test_type)').eq('test_suite_id', id);
  const cases = (links ?? []).map((l: any) => l.test_cases).filter(Boolean);
  return NextResponse.json({ suite: data, test_suite: data, cases, data, ...data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateSuite(req, id);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateSuite(req, id);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabase();
  const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('X-API-Key') || req.headers.get('authorization');
  if (apiKeyHeader) {
    const auth = await validateApiKey(req);
    if (!auth.valid) return NextResponse.json({ error: auth.error || 'Invalid or revoked API key' }, { status: 401 });
    const scopes = auth.scopes || [];
    const canDeleteSuite = scopes.includes('suites:write') || scopes.includes('suites:delete') || scopes.includes('*');
    if (!canDeleteSuite) {
      return NextResponse.json({ error: `Forbidden: scope required: suites:write, key has only: ${scopes.join(', ') || 'none'}` }, { status: 403 });
    }
    const { error } = await supabase.from('test_suites').delete().eq('id', id).eq('organization_id', auth.organization_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { error } = await supabase.from('test_suites').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}