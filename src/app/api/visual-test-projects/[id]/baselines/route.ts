import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError } from '@/lib/auth/require-org-permission';
import { validateApiKey, hasScope } from '@/lib/api-key-auth';
import { checkApiKeyRateLimit } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from('visual_baselines')
    .select('*')
    .eq('visual_project_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Could not load baselines.' }, { status: 500 });
  return NextResponse.json({ baselines: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: project, error: projError } = await supabase
    .from('visual_test_projects')
    .select('organization_id')
    .eq('id', id)
    .maybeSingle();
  if (projError || !project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  try { await requireOrgPermission(supabase, user.id, project.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const url = typeof body.url === 'string' ? body.url : '';
  const browser = typeof body.browser === 'string' ? body.browser : 'chromium';
  const viewportWidth = typeof body.viewportWidth === 'number' ? body.viewportWidth : 1280;
  const viewportHeight = typeof body.viewportHeight === 'number' ? body.viewportHeight : 720;
  const selector = typeof body.selector === 'string' ? body.selector : null;

  if (!name || !url) return NextResponse.json({ error: 'Name and URL are required.' }, { status: 400 });

  // In production, capture screenshot here using Playwright
  const screenshotUrl = `https://example.com/baselines/${id}/${name}.png`;
  const screenshotHash = 'sha256_' + Math.random().toString(36).substring(2, 15);

  const { data, error } = await supabase
    .from('visual_baselines')
    .insert({
      visual_project_id: id,
      organization_id: project.organization_id,
      name,
      url,
      selector,
      browser,
      viewport_width: viewportWidth,
      viewport_height: viewportHeight,
      screenshot_url: screenshotUrl,
      screenshot_hash: screenshotHash,
      status: 'active',
    })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not create baseline.' }, { status: 500 });
  return NextResponse.json({ baseline: data }, { status: 201 });
}