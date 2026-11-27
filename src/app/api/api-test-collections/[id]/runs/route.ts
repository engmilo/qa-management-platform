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
    .from('api_test_runs')
    .select('*')
    .eq('collection_id', id)
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
  const { data: collection, error: collError } = await supabase
    .from('api_test_collections')
    .select('organization_id')
    .eq('id', id)
    .maybeSingle();
  if (collError || !collection) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 });

  try { await requireOrgPermission(supabase, user.id, collection.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const { data: run, error } = await supabase
    .from('api_test_runs')
    .insert({
      collection_id: id,
      organization_id: collection.organization_id,
      name: typeof body.name === 'string' ? body.name.trim() || null : null,
      status: 'pending',
      environment: typeof body.environment === 'string' ? body.environment : null,
      variables: body.variables || {},
      created_by: user.id,
    })
    .select()
    .maybeSingle();

  if (error || !run) return NextResponse.json({ error: 'Could not create run.' }, { status: 500 });

  // Start background execution
  executeRunInBackground(run.id, collection.organization_id);

  return NextResponse.json({ run }, { status: 201 });
}

async function executeRunInBackground(runId: string, organizationId: string) {
  const supabase = createRouteSupabaseClient();

  try {
    await supabase
      .from('api_test_runs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', runId);

    const { data: run } = await supabase
      .from('api_test_runs')
      .select('*, api_test_collections(*)')
      .eq('id', runId)
      .single();

    if (!run) throw new Error('Run not found');

    const { data: testCases } = await supabase
      .from('api_test_cases')
      .select('*')
      .eq('collection_id', run.collection_id)
      .order('order_index');

    if (!testCases?.length) throw new Error('No test cases in collection');

    const baseUrl = run.api_test_collections.base_url || '';
    const globalHeaders = run.api_test_collections.headers || {};
    const authConfig = run.api_test_collections.auth_config || {};
    const variables = run.variables || {};

    let passed = 0, failed = 0, skipped = 0;

    for (const testCase of testCases) {
      const result = await executeAPITestCase(testCase, baseUrl, globalHeaders, authConfig, variables, organizationId, runId);

      if (result.status === 'passed') passed++;
      else if (result.status === 'failed') failed++;
      else skipped++;
    }

    const summary = {
      total: testCases.length,
      passed,
      failed,
      skipped,
      passRate: (passed / testCases.length) * 100,
    };

    await supabase
      .from('api_test_runs')
      .update({
        status: failed > 0 ? 'failed' : 'passed',
        completed_at: new Date().toISOString(),
        summary,
      })
      .eq('id', runId);

  } catch (error) {
    await supabase
      .from('api_test_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
  }
}

async function executeAPITestCase(
  testCase: any,
  baseUrl: string,
  globalHeaders: Record<string, string>,
  authConfig: Record<string, unknown>,
  variables: Record<string, string>,
  organizationId: string,
  runId: string
) {
  const url = replaceVariables(`${baseUrl}${testCase.path}`, variables);
  const headers = { ...globalHeaders, ...testCase.headers };
  const queryParams = testCase.query_params || {};
  const body = testCase.body;

  if (authConfig.type === 'bearer' && authConfig.token) {
    headers['Authorization'] = `Bearer ${replaceVariables(authConfig.token as string, variables)}`;
  } else if (authConfig.type === 'apiKey' && authConfig.key && authConfig.value) {
    headers[authConfig.key as string] = replaceVariables(authConfig.value as string, variables);
  }

  const queryString = new URLSearchParams(queryParams as Record<string, string>).toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  const startTime = Date.now();

  try {
    const response = await fetch(fullUrl, {
      method: testCase.method,
      headers: headers as HeadersInit,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseTime = Date.now() - startTime;
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => { responseHeaders[key] = value; });

    let responseBody: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    const assertionResults = testCase.assertions?.map((assertion: any) => {
      let actual: unknown;
      let passed = false;

      switch (assertion.type) {
        case 'status':
          actual = response.status;
          passed = evaluateAssertion(actual, assertion.operator, assertion.value);
          break;
        case 'responseTime':
          actual = responseTime;
          passed = evaluateAssertion(actual, assertion.operator, assertion.value);
          break;
        case 'header':
          actual = responseHeaders[assertion.target || ''];
          passed = evaluateAssertion(actual, assertion.operator, assertion.value);
          break;
        case 'body':
          actual = getNestedValue(responseBody, assertion.target || '');
          passed = evaluateAssertion(actual, assertion.operator, assertion.value);
          break;
      }

      return { assertion, passed, actual };
    }) || [];

    const allPassed = assertionResults.every(r => r.passed);
    const status = allPassed ? 'passed' : 'failed';

    const supabase = createRouteSupabaseClient();
    await supabase.from('api_test_results').insert({
      run_id: runId,
      test_case_id: testCase.id,
      organization_id: organizationId,
      status,
      request: { url: fullUrl, method: testCase.method, headers, body },
      response: { status: response.status, headers: responseHeaders, body: responseBody },
      response_time_ms: responseTime,
      status_code: response.status,
      assertions_passed: assertionResults.filter(r => r.passed).length,
      assertions_failed: assertionResults.filter(r => !r.passed).length,
      assertion_details: assertionResults,
    });

    return { status };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const supabase = createRouteSupabaseClient();
    await supabase.from('api_test_results').insert({
      run_id: runId,
      test_case_id: testCase.id,
      organization_id: organizationId,
      status: 'error',
      request: { url: fullUrl, method: testCase.method, headers, body },
      response: { status: 0, headers: {}, body: null },
      response_time_ms: responseTime,
      status_code: 0,
      assertions_passed: 0,
      assertions_failed: 0,
      assertion_details: [],
      error_message: errorMessage,
    });

    return { status: 'error' };
  }
}

function replaceVariables(str: string, variables: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
}

function evaluateAssertion(actual: unknown, operator: string, expected: string | number): boolean {
  const expectedNum = typeof expected === 'string' ? parseFloat(expected) : expected;
  const actualNum = typeof actual === 'number' ? actual : parseFloat(String(actual));

  switch (operator) {
    case 'equals': return actual === expected;
    case 'contains': return String(actual).includes(String(expected));
    case 'lessThan': return actualNum < expectedNum;
    case 'greaterThan': return actualNum > expectedNum;
    case 'exists': return actual !== undefined && actual !== null && actual !== '';
    default: return false;
  }
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}