import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError } from '@/lib/auth/require-org-permission';

const TYPES = ['functional','regression','integration','system','api','ui','performance','security','exploratory','uat'];
const PRIORITIES = ['low','medium','high','critical'];
const AUTOMATIONS = ['manual','automated','to_automate','not_automatable'];

// POST /api/test-cases/import { projectId, cases: [{ case_key, title, test_type, priority, category, automation_status, description, preconditions, estimate_minutes, tags }] }
// Skips existing case_key in that project. Never overwrites, never deletes.
export async function POST(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const incoming = Array.isArray(body.cases) ? body.cases : [];
  if (!projectId) return NextResponse.json({ error: 'Select a project.' }, { status: 400 });
  if (!incoming.length) return NextResponse.json({ error: 'No cases to import.' }, { status: 400 });
  if (incoming.length > 500) return NextResponse.json({ error: 'Max 500 cases per import.' }, { status: 400 });

  const { data: project } = await supabase.from('projects').select('id, organization_id').eq('id', projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Select a project you can access.' }, { status: 400 });
  try { await requireOrgPermission(supabase, user.id, (project as any).organization_id, 'canEditTestCase'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  // Existing keys — to skip duplicates
  const { data: existing } = await supabase.from('test_cases').select('case_key').eq('project_id', projectId);
  const existingKeys = new Set((existing ?? []).map((r: any) => String(r.case_key).trim().toLowerCase()));

  let added = 0;
  const skipped: string[] = [];
  const errors: { key: string; error: string }[] = [];
  const seen = new Set<string>();

  for (const raw of incoming) {
    const key = String(raw.case_key ?? '').trim();
    const title = String(raw.title ?? '').trim();
    if (!key || !title) { errors.push({ key: key || '(no key)', error: 'Missing Key or Title — skipped.' }); continue; }
    const lower = key.toLowerCase();
    if (existingKeys.has(lower) || seen.has(lower)) { skipped.push(key); continue; }
    seen.add(lower);

    const testType = TYPES.includes(String(raw.test_type ?? '').toLowerCase()) ? String(raw.test_type).toLowerCase() : 'functional';
    const priority = PRIORITIES.includes(String(raw.priority ?? '').toLowerCase()) ? String(raw.priority).toLowerCase() : 'medium';
    const automation = AUTOMATIONS.includes(String(raw.automation_status ?? '').toLowerCase()) ? String(raw.automation_status).toLowerCase() : 'manual';
    const est = raw.estimate_minutes === '' || raw.estimate_minutes == null ? null : Number(raw.estimate_minutes);
    const tags = Array.isArray(raw.tags) ? raw.tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim()) : [];

    const { error: insErr } = await supabase.from('test_cases').insert({
      project_id: projectId,
      organization_id: (project as any).organization_id,
      case_key: key,
      title,
      description: String(raw.description ?? '').trim() || null,
      preconditions: String(raw.preconditions ?? '').trim() || null,
      priority,
      test_type: testType,
      category: String(raw.category ?? '').trim() || 'General',
      automation_status: automation,
      tags: tags.length ? tags : null,
      estimate_minutes: Number.isFinite(est) ? est : null,
      author_id: user.id,
    });
    if (insErr) { errors.push({ key, error: insErr.message }); continue; }
    added++;
  }

  return NextResponse.json({ added, skipped, skippedCount: skipped.length, errors });
}