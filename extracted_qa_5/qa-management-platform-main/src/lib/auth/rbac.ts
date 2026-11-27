import { getCurrentUserWithOrg } from './session';
import { canAccessModule, hasPermission } from './permissions';
import type { UserRole } from '@/types/supabase';

export async function checkPermission(permission: string) {
  const userData = await getCurrentUserWithOrg();
  
  if (!userData?.user) {
    return { allowed: false, user: null };
  }

  const role = userData.currentOrg?.role as UserRole;
  
  if (!role) {
    return { allowed: false, user: userData.user, role: null };
  }

  const allowed = hasPermission(role, permission as any);
  
  return { allowed, user: userData.user, role, permissions: userData };
}

export async function requirePermission(permission: string) {
  const check = await checkPermission(permission);
  
  if (!check.allowed) {
    throw new Error('Insufficient permissions');
  }
  
  return check;
}

export async function checkModuleAccess(module: string) {
  const userData = await getCurrentUserWithOrg();
  
  if (!userData?.user) {
    return false;
  }

  const role = userData.currentOrg?.role as UserRole;
  
  if (!role) {
    return false;
  }

  return canAccessModule(role, module as any);
}
