'use server';

import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { revalidatePath } from 'next/cache';

export interface APITestCase {
  id: string;
  name: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: unknown;
  assertions: Array<{
    type: 'status' | 'body' | 'header' | 'responseTime';
    operator: 'equals' | 'contains' | 'lessThan' | 'greaterThan' | 'exists';
    target?: string;
    value: string | number;
  }>;
}

export interface APITestResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    responseTime: number;
  };
  assertions: Array<{
    assertion: APITestCase['assertions'][0];
    passed: boolean;
    actual: unknown;
  }>;
  error?: string;
}

export async function runAPICollectionRun(runId: string, organizationId: string) {
  const supabase = createRouteSupabaseClient();

  await supabase
    .from('api_test_runs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', runId);

  try {
    // Get collection with test cases
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

    const results: APITestResult[] = [];
    let passed = 0, failed = 0, skipped = 0;

    for (const testCase of testCases) {
      const result = await executeAPITestCase(testCase, baseUrl, globalHeaders, authConfig, variables, organizationId);
      results.push(result);

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

    revalidatePath(`/api-testing`);
    return { success: true, results, summary };
  } catch (error) {
    await supabase
      .from('api_test_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
    throw error;
  }
}

async function executeAPITestCase(
  testCase: any,
  baseUrl: string,
  globalHeaders: Record<string, string>,
  authConfig: Record<string, unknown>,
  variables: Record<string, string>,
  organizationId: string
): Promise<APITestResult> {
  const url = replaceVariables(`${baseUrl}${testCase.path}`, variables);
  const headers = { ...globalHeaders, ...testCase.headers };
  const queryParams = testCase.queryParams || {};
  const body = testCase.body;

  // Apply auth
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

    // Evaluate assertions
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

    // Store result
    const supabase = createRouteSupabaseClient();
    await supabase.from('api_test_results').insert({
      run_id: testCase.collection_id, // This would need run_id
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

    return {
      testCaseId: testCase.id,
      status,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        responseTime,
      },
      assertions: assertionResults,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      testCaseId: testCase.id,
      status: 'error',
      response: {
        status: 0,
        statusText: 'Error',
        headers: {},
        body: null,
        responseTime,
      },
      assertions: [],
      error: errorMessage,
    };
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

export async function importPostmanCollection(collectionJson: any, projectId: string, organizationId: string, userId: string) {
  const supabase = createRouteSupabaseClient();

  const { data: collection, error } = await supabase
    .from('api_test_collections')
    .insert({
      project_id: projectId,
      organization_id: organizationId,
      name: collectionJson.info?.name || 'Imported Collection',
      description: collectionJson.info?.description || '',
      spec_type: 'postman',
      spec_content: collectionJson,
      base_url: collectionJson.variable?.[0]?.value || '',
      created_by: userId,
    })
    .select()
    .single();

  if (error || !collection) throw new Error('Failed to create collection');

  // Parse items recursively
  const parseItems = (items: any[], parentId?: string, order = 0) => {
    return items.flatMap((item, index) => {
      if (item.item) {
        // Folder - recurse
        return parseItems(item.item, undefined, order + index);
      }
      if (item.request) {
        return {
          collection_id: collection.id,
          organization_id: organizationId,
          name: item.name || 'Unnamed Request',
          method: item.request.method || 'GET',
          path: item.request.url?.path?.join('/') || item.request.url?.raw || '',
          headers: Object.fromEntries((item.request.header || []).map((h: any) => [h.key, h.value])),
          query_params: Object.fromEntries((item.request.url?.query || []).map((q: any) => [q.key, q.value])),
          body: item.request.body?.raw ? JSON.parse(item.request.body.raw) : null,
          assertions: [],
          order_index: order + index,
        };
      }
      return [];
    });
  };

  const testCases = parseItems(collectionJson.item || []);

  if (testCases.length) {
    await supabase.from('api_test_cases').insert(testCases);
  }

  return { collection, testCaseCount: testCases.length };
}