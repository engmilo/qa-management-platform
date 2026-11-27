import { getPermissions } from './permissions';
import type { UserPermissions } from './permissions';
import type { UserRole } from '@/types/supabase';

// P0: enforce RBAC per-resource org, not "first org of user".
// Existing checkPermission() in rbac.ts uses currentOrg = memberships[0],
// which is wrong when a user belongs to multiple orgs.
export async function getRoleForOrg(supabase: any, userId: string, organizationId: string): Promise<UserRole | null> {
  const { data, error } = await supabase.from('organization_members').select('role').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return data.role as UserRole;
}
export async function requireOrgPermission(supabase: any, userId: string, organizationId: string, permission: keyof Omit<UserPermissions, 'role'>): Promise<{ role: UserRole; permissions: UserPermissions }> {
  const role = await getRoleForOrg(supabase, userId, organizationId);
  if (!role) throw Object.assign(new Error('You do not have access to this organization.'), { status: 403 });
  const permissions = getPermissions(role);
  if (!permissions[permission]) throw Object.assign(new Error('Insufficient permissions.'), { status: 403 });
  return { role, permissions };
}
export function permissionError(e: unknown) {
  const status = (e as any)?.status ?? 500;
  const message = e instanceof Error ? e.message : 'Could not complete this action.';
  return { status, message };
}
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

