import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// GET /api/test-cases/export?projectId=...&priority=...&type=...&status=...&search=...
// Returns CSV download. Same columns Import reads, so Export -> Import round-trips.
// Import reads: Key, Title, Type, Priority, Category, Automation, Description,
// Preconditions, Estimate (min), Tags. Status is included for humans —
// Import currently ignores it on re-import.
export async function GET(request: NextRequest) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const projectId = params.get('projectId') || params.get('project_id') || '';
  const priority = params.get('priority') || '';
  const type = params.get('type') || params.get('test_type') || '';
  const status = params.get('status') || '';
  const search = params.get('search') || params.get('q') || '';

  let query = supabase.from('test_cases').select('*').order('case_key', { ascending: true });
  if (projectId) query = query.eq('project_id', projectId);
  if (priority && priority !== 'all') query = query.eq('priority', priority.toLowerCase());
  if (type && type !== 'all') query = query.eq('test_type', type.toLowerCase());
  if (status && status !== 'all') query = query.eq('status', status.toLowerCase());
  if (search) query = query.or(`case_key.ilike.%${search}%,title.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load test cases.' }, { status: 500 });

  const header = ['Key', 'Title', 'Type', 'Priority', 'Category', 'Automation', 'Status', 'Description', 'Preconditions', 'Estimate (min)', 'Tags'];
  const lines = [header.join(',')];
  for (const c of (data ?? []) as any[]) {
    lines.push([
      csvCell(c.case_key),
      csvCell(c.title),
      csvCell(c.test_type),
      csvCell(c.priority),
      csvCell(c.category),
      csvCell(c.automation_status),
      csvCell(c.status),
      csvCell(c.description),
      csvCell(c.preconditions),
      csvCell(c.estimate_minutes),
      csvCell(c.tags),
    ].join(','));
  }

  // BOM so Excel opens UTF-8 correctly
  const body = '\uFEFF' + lines.join('\r\n');
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="test-cases.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
