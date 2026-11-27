import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError } from '@/lib/auth/require-org-permission';
import { validateApiKey, hasScope } from '@/lib/api-key-auth';
import { checkApiKeyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }

  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const collectionJson = body.collection;

  if (!projectId || !collectionJson) return NextResponse.json({ error: 'Project ID and collection are required.' }, { status: 400 });

  const { data: project, error: projectError } = await supabase.from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (projectError || !project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });

  try { await requireOrgPermission(supabase, user.id, (project as any).organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  // Create collection
  const { data: collection, error: collError } = await supabase
    .from('api_test_collections')
    .insert({
      project_id: project.id,
      organization_id: (project as any).organization_id,
      name: (collectionJson as any).info?.name || 'Imported Collection',
      description: (collectionJson as any).info?.description || '',
      spec_type: 'postman',
      spec_content: collectionJson,
      base_url: (collectionJson as any).variable?.[0]?.value || '',
      created_by: user.id,
    })
    .select()
    .single();

  if (collError || !collection) return NextResponse.json({ error: 'Failed to create collection.' }, { status: 400 });

  // Parse items recursively
  const parseItems = (items: any[]): any[] => {
    return items.flatMap((item) => {
      if (item.item) {
        // Folder - recurse
        return parseItems(item.item);
      }
      if (item.request) {
        return {
          collection_id: collection.id,
          organization_id: (project as any).organization_id,
          name: item.name || 'Unnamed Request',
          method: item.request.method || 'GET',
          path: item.request.url?.path?.join('/') || item.request.url?.raw || '',
          headers: Object.fromEntries((item.request.header || []).map((h: any) => [h.key, h.value])),
          query_params: Object.fromEntries((item.request.url?.query || []).map((q: any) => [q.key, q.value])),
          body: item.request.body?.raw ? JSON.parse(item.request.body.raw) : null,
          assertions: [],
          test_type: 'functional',
          order_index: 0, // Will be updated
        };
      }
      return [];
    });
  };

  const testCases = parseItems((collectionJson as any).item || []);

  // Add order_index
  const testCasesWithOrder = testCases.map((tc, index) => ({ ...tc, order_index: index }));

  if (testCasesWithOrder.length) {
    await supabase.from('api_test_cases').insert(testCasesWithOrder);
  }

  return NextResponse.json({ collection, testCaseCount: testCasesWithOrder.length }, { status: 201 });
}