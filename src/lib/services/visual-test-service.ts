'use server';

import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { revalidatePath } from 'next/cache';

export interface VisualTestConfig {
  browsers: string[];
  viewports: Array<{ width: number; height: number }>;
  threshold: number;
}

export interface VisualTestResult {
  baselineId: string;
  status: 'approved' | 'changes_detected' | 'failed';
  diffPercentage: number;
  diffPixels: number;
  totalPixels: number;
  actualScreenshotUrl: string;
  diffScreenshotUrl?: string;
  error?: string;
}

export async function runVisualTestRun(runId: string, organizationId: string) {
  const supabase = createRouteSupabaseClient();

  await supabase
    .from('visual_test_runs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', runId);

  try {
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

    const config: VisualTestConfig = {
      browsers: run.visual_test_projects.browsers || ['chromium'],
      viewports: run.visual_test_projects.viewports || [{ width: 1280, height: 720 }],
      threshold: run.visual_test_projects.threshold || 0.01,
    };

    const results: VisualTestResult[] = [];
    let approved = 0, changesDetected = 0, failed = 0;

    for (const baseline of baselines) {
      // In production, this would use Playwright/Puppeteer to capture screenshots
      // and pixelmatch/resemble.js for comparison
      const result = await executeVisualComparison(baseline, config, run, organizationId);
      results.push(result);

      if (result.status === 'approved') approved++;
      else if (result.status === 'changes_detected') changesDetected++;
      else failed++;
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

    revalidatePath(`/visual-testing`);
    return { success: true, results, summary };
  } catch (error) {
    await supabase
      .from('visual_test_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
    throw error;
  }
}

async function executeVisualComparison(
  baseline: any,
  config: VisualTestConfig,
  run: any,
  organizationId: string
): Promise<VisualTestResult> {
  // In production, integrate with:
  // 1. Playwright for screenshot capture
  // 2. pixelmatch / resemble.js for diff
  // 3. Cloud storage (S3, Supabase Storage) for screenshots
  // 4. Percy/Chromatic APIs for managed visual testing

  // For now, simulate the comparison
  const browser = config.browsers[0];
  const viewport = config.viewports[0];

  // Simulate: sometimes there are changes, sometimes not
  const hasChanges = Math.random() > 0.7;
  const diffPercentage = hasChanges ? Math.random() * 5 : Math.random() * 0.5;
  const totalPixels = viewport.width * viewport.height;
  const diffPixels = Math.floor(totalPixels * diffPercentage / 100);

  const status = diffPercentage > config.threshold * 100
    ? 'changes_detected'
    : 'approved';

  // Store result
  const supabase = createRouteSupabaseClient();
  await supabase.from('visual_test_results').insert({
    run_id: run.id,
    baseline_id: baseline.id,
    organization_id: organizationId,
    status,
    diff_percentage: diffPercentage,
    diff_pixels: diffPixels,
    total_pixels: totalPixels,
    actual_screenshot_url: `https://example.com/screenshots/${run.id}/${baseline.id}/actual.png`,
    diff_screenshot_url: diffPercentage > config.threshold * 100
      ? `https://example.com/screenshots/${run.id}/${baseline.id}/diff.png`
      : null,
    browser,
    viewport_width: viewport.width,
    viewport_height: viewport.height,
  });

  return {
    baselineId: baseline.id,
    status,
    diffPercentage,
    diffPixels,
    totalPixels,
    actualScreenshotUrl: `https://example.com/screenshots/${run.id}/${baseline.id}/actual.png`,
    diffScreenshotUrl: diffPercentage > config.threshold * 100
      ? `https://example.com/screenshots/${run.id}/${baseline.id}/diff.png`
      : undefined,
  };
}

export async function captureBaseline(
  visualProjectId: string,
  name: string,
  url: string,
  selector: string | null,
  browser: string,
  viewport: { width: number; height: number },
  organizationId: string,
  userId: string
) {
  const supabase = createRouteSupabaseClient();

  // In production: use Playwright to navigate and capture screenshot
  // const screenshot = await captureScreenshot(url, selector, browser, viewport);
  // const screenshotUrl = await uploadToStorage(screenshot);
  // const screenshotHash = await computeHash(screenshot);

  // Simulate
  const screenshotUrl = `https://example.com/baselines/${visualProjectId}/${name}.png`;
  const screenshotHash = 'sha256_' + Math.random().toString(36).substring(2, 15);

  const { data: baseline, error } = await supabase
    .from('visual_baselines')
    .insert({
      visual_project_id: visualProjectId,
      organization_id: organizationId,
      name,
      url,
      selector,
      browser,
      viewport_width: viewport.width,
      viewport_height: viewport.height,
      screenshot_url: screenshotUrl,
      screenshot_hash: screenshotHash,
      status: 'active',
    })
    .select()
    .single();

  if (error || !baseline) throw new Error('Failed to create baseline');

  return baseline;
}

export async function updateBaseline(baselineId: string, organizationId: string, userId: string) {
  // Approve the latest actual screenshot as the new baseline
  const supabase = createRouteSupabaseClient();

  const { data: latestResult } = await supabase
    .from('visual_test_results')
    .select('*')
    .eq('baseline_id', baselineId)
    .order('executed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestResult) throw new Error('No test result found for this baseline');

  // Update baseline with new screenshot
  const { data: baseline, error } = await supabase
    .from('visual_baselines')
    .update({
      screenshot_url: latestResult.actual_screenshot_url,
      screenshot_hash: 'sha256_' + Math.random().toString(36).substring(2, 15),
      updated_at: new Date().toISOString(),
    })
    .eq('id', baselineId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error || !baseline) throw new Error('Failed to update baseline');

  return baseline;
}

// Playwright integration helper (to be used in a separate Node.js process or edge function)
export const PLAYWRIGHT_VISUAL_TEST_SCRIPT = `
// Save as: visual-test-runner.js
// Run with: npx playwright test visual-test-runner.js

import { test, expect } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

test('visual regression test', async ({ page }) => {
  const baselines = [
    { name: 'homepage', url: 'https://app.example.com/', selector: null },
    { name: 'login', url: 'https://app.example.com/login', selector: '#login-form' },
    { name: 'dashboard', url: 'https://app.example.com/dashboard', selector: '.dashboard' },
  ];

  const viewport = { width: 1280, height: 720 };
  const threshold = 0.01; // 1%

  for (const baseline of baselines) {
    await page.goto(baseline.url);
    await page.setViewportSize(viewport);

    if (baseline.selector) {
      await page.waitForSelector(baseline.selector);
    }

    await page.waitForLoadState('networkidle');

    const screenshot = await page.screenshot({
      fullPage: !baseline.selector,
      path: \`./screenshots/actual-\${baseline.name}.png\`
    });

    // Compare with baseline
    const baselinePath = \`./baselines/\${baseline.name}.png\`;
    if (fs.existsSync(baselinePath)) {
      const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
      const img2 = PNG.sync.read(screenshot);
      const diff = new PNG({ width: img1.width, height: img1.height });

      const diffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold });
      const diffPercentage = (diffPixels / (img1.width * img1.height)) * 100;

      fs.writeFileSync(\`./screenshots/diff-\${baseline.name}.png\`, PNG.sync.write(diff));

      if (diffPercentage > threshold * 100) {
        console.log(\`VISUAL CHANGE DETECTED: \${baseline.name} - \${diffPercentage.toFixed(2)}% diff\`);
        // Upload diff to your API
      } else {
        console.log(\`OK: \${baseline.name} - \${diffPercentage.toFixed(2)}% diff\`);
      }
    } else {
      // First run - save as baseline
      fs.writeFileSync(baselinePath, screenshot);
      console.log(\`BASELINE CREATED: \${baseline.name}\`);
    }
  }
});
`;