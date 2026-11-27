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
    .from('visual_test_runs')
    .select('*')
    .eq('visual_project_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Could not load runs.' }, { status: 500 });
  return NextResponse.json({ runs: data ?? [] });
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
    .select('organization_id, browsers, viewports, threshold')
    .eq('id', id)
    .maybeSingle();
  if (projError || !project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  try { await requireOrgPermission(supabase, user.id, project.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const { data: run, error } = await supabase
    .from('visual_test_runs')
    .insert({
      visual_project_id: id,
      organization_id: project.organization_id,
      name: typeof body.name === 'string' ? body.name.trim() || null : null,
      status: 'pending',
      branch: typeof body.branch === 'string' ? body.branch : null,
      commit_sha: typeof body.commitSha === 'string' ? body.commitSha : null,
      created_by: user.id,
    })
    .select()
    .maybeSingle();

  if (error || !run) return NextResponse.json({ error: 'Could not create run.' }, { status: 500 });

  // Start background execution
  executeRunInBackground(run.id, project.organization_id);

  return NextResponse.json({ run }, { status: 201 });
}

async function executeRunInBackground(runId: string, organizationId: string) {
  const supabase = createRouteSupabaseClient();

  try {
    await supabase
      .from('visual_test_runs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', runId);

    const { data: run } = await supabase
      .from('visual_test_runs')
      .select('*, visual_test_projects(*)')
      .eq('id', runId)
      .single();

    if (!run) throw new Error('Run not found');

    const { data: baselines } = await supabase
      .from('visual_baselines')
      .select('*')
      .eq('visual_project_id', run.visual_project_id)
      .eq('status', 'active');

    if (!baselines?.length) throw new Error('No active baselines found');

    const config = {
      browsers: run.visual_test_projects.browsers || ['chromium'],
      viewports: run.visual_test_projects.viewports || [{ width: 1280, height: 720 }],
      threshold: run.visual_test_projects.threshold || 0.01,
    };

    let approved = 0, changesDetected = 0, failed = 0;

    for (const baseline of baselines) {
      // Simulate visual comparison
      const hasChanges = Math.random() > 0.7;
      const diffPercentage = hasChanges ? Math.random() * 5 : Math.random() * 0.5;
      const totalPixels = baseline.viewport_width * baseline.viewport_height;
      const diffPixels = Math.floor(totalPixels * diffPercentage / 100);

      const status = diffPercentage > config.threshold * 100
        ? 'changes_detected'
        : 'approved';

      if (status === 'approved') approved++;
      else if (status === 'changes_detected') changesDetected++;
      else failed++;

      await supabase.from('visual_test_results').insert({
        run_id: runId,
        baseline_id: baseline.id,
        organization_id: organizationId,
        status,
        diff_percentage: diffPercentage,
        diff_pixels: diffPixels,
        total_pixels: totalPixels,
        actual_screenshot_url: `https://example.com/screenshots/${runId}/${baseline.id}/actual.png`,
        diff_screenshot_url: diffPercentage > config.threshold * 100
          ? `https://example.com/screenshots/${runId}/${baseline.id}/diff.png`
          : null,
        browser: baseline.browser,
        viewport_width: baseline.viewport_width,
        viewport_height: baseline.viewport_height,
      });
    }

    const summary = {
      total: baselines.length,
      approved,
      changesDetected,
      failed,
      passRate: (approved / baselines.length) * 100,
    };

    const runStatus = failed > 0 ? 'failed' : changesDetected > 0 ? 'changes_detected' : 'completed';

    await supabase
      .from('visual_test_runs')
      .update({
        status: runStatus,
        completed_at: new Date().toISOString(),
        summary,
      })
      .eq('id', runId);

  } catch (error) {
    await supabase
      .from('visual_test_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
  }
}