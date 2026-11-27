'use server';

import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { revalidatePath } from 'next/cache';

export interface K6Metrics {
  vus: number;
  rps: number;
  latency_p50: number;
  latency_p90: number;
  latency_p95: number;
  latency_p99: number;
  error_rate: number;
  checks_passed: number;
  checks_failed: number;
  data_received: number;
  data_sent: number;
}

export interface PerformanceTestConfig {
  script: string;
  virtualUsers: number;
  durationSeconds: number;
  rampUpSeconds: number;
  thresholds: Record<string, string>;
}

export async function runPerformanceTest(testId: string, projectId: string, organizationId: string) {
  const supabase = createRouteSupabaseClient();

  // Update test status to running
  await supabase
    .from('performance_tests')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', testId);

  try {
    // Generate k6 script if not provided
    const { data: test } = await supabase
      .from('performance_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (!test) throw new Error('Test not found');

    const k6Script = test.script || generateDefaultK6Script(test.configuration);
    const config: PerformanceTestConfig = {
      script: k6Script,
      virtualUsers: test.virtual_users,
      durationSeconds: test.duration_seconds,
      rampUpSeconds: test.ramp_up_seconds,
      thresholds: test.thresholds || {},
    };

    // In production, this would call k6 API or run k6 CLI
    // For now, simulate the test execution
    const metrics = await executeK6Test(config, testId, organizationId);

    // Calculate summary
    const summary = {
      totalRequests: metrics.checks_passed + metrics.checks_failed,
      passRate: metrics.checks_passed / (metrics.checks_passed + metrics.checks_failed || 1) * 100,
      avgLatency: metrics.latency_p50,
      p95Latency: metrics.latency_p95,
      errorRate: metrics.error_rate * 100,
    };

    // Update test with results
    await supabase
      .from('performance_tests')
      .update({
        status: metrics.error_rate > 0.05 ? 'failed' : 'completed',
        completed_at: new Date().toISOString(),
        metrics,
        summary,
        updated_at: new Date().toISOString()
      })
      .eq('id', testId);

    revalidatePath(`/performance-testing`);
    return { success: true, metrics, summary };
  } catch (error) {
    await supabase
      .from('performance_tests')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', testId);

    throw error;
  }
}

async function executeK6Test(config: PerformanceTestConfig, testId: string, organizationId: string): Promise<K6Metrics> {
  // This is where you'd integrate with actual k6
  // Options:
  // 1. Call k6 REST API (k6 Cloud)
  // 2. Execute k6 CLI via child_process
  // 3. Use k6 JavaScript API programmatically
  // 4. Send to a queue for async execution

  // Simulate test execution with progress updates
  const steps = 10;
  const intervalMs = (config.durationSeconds * 1000) / steps;

  const supabase = createRouteSupabaseClient();

  for (let i = 1; i <= steps; i++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs / 10)); // Faster for demo

    // Simulate realistic metrics
    const progress = i / steps;
    const baseVUs = Math.floor(config.virtualUsers * progress);
    const baseRPS = baseVUs * (5 + Math.random() * 10);

    const metrics: K6Metrics = {
      vus: baseVUs,
      rps: baseRPS,
      latency_p50: 100 + Math.random() * 200,
      latency_p90: 250 + Math.random() * 300,
      latency_p95: 400 + Math.random() * 400,
      latency_p99: 800 + Math.random() * 600,
      error_rate: Math.random() * 0.03,
      checks_passed: Math.floor(baseRPS * 0.97 * i),
      checks_failed: Math.floor(baseRPS * 0.03 * i),
      data_received: Math.floor(baseRPS * 2048 * i),
      data_sent: Math.floor(baseRPS * 512 * i),
    };

    // Store intermediate results
    await supabase.from('performance_test_results').insert({
      performance_test_id: testId,
      organization_id: organizationId,
      ...metrics,
    });
  }

  // Return final metrics
  return {
    vus: config.virtualUsers,
    rps: config.virtualUsers * 8,
    latency_p50: 180,
    latency_p90: 380,
    latency_p95: 520,
    latency_p99: 980,
    error_rate: 0.012,
    checks_passed: 78400,
    checks_failed: 960,
    data_received: 160000000,
    data_sent: 40000000,
  };
}

function generateDefaultK6Script(config: Record<string, unknown>): string {
  const baseUrl = (config.baseUrl as string) || 'http://localhost:3000';
  const endpoints = (config.endpoints as string[]) || ['/api/health', '/api/users'];

  return `
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '${Math.floor((config.rampUpSeconds as number) || 60)}s', target: ${config.virtualUsers || 100} },
    { duration: '${Math.floor((config.durationSeconds as number) || 300)}s', target: ${config.virtualUsers || 100} },
    { duration: '30s', target: 0 },
  ],
  thresholds: ${JSON.stringify(config.thresholds || {})},
};

const BASE_URL = '${baseUrl}';
const ENDPOINTS = ${JSON.stringify(endpoints)};

export default function () {
  const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const res = http.get(\`\${BASE_URL}\${endpoint}\`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
`;
}