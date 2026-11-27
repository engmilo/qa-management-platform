import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase/route-client';
import { requireOrgPermission, permissionError } from '@/lib/auth/require-org-permission';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: test, error: testError } = await supabase
    .from('performance_tests')
    .select('organization_id, status')
    .eq('id', id)
    .maybeSingle();
  if (testError || !test) return NextResponse.json({ error: 'Test not found.' }, { status: 404 });
  if (test.status !== 'running') return NextResponse.json({ error: 'Test is not running.' }, { status: 400 });

  try { await requireOrgPermission(supabase, user.id, test.organization_id, 'canExecuteTests'); } catch (e) { const pe = permissionError(e); return NextResponse.json({ error: pe.message }, { status: pe.status }); }

  const { error } = await supabase
    .from('performance_tests')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not stop test.' }, { status: 500 });

  return NextResponse.json({ success: true, message: 'Test stopped' });
}