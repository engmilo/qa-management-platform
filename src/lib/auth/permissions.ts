
// RBAC Permission System for Multi-Tenant QA Management Platform

import type { UserRole } from '@/types/supabase';

export interface UserPermissions {
  role: UserRole;
  canCreateProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canInviteMembers: boolean;
  canManageRoles: boolean;
  canCreateRequirement: boolean;
  canEditRequirement: boolean;
  canDeleteRequirement: boolean;
  canCreateTestCase: boolean;
  canEditTestCase: boolean;
  canDeleteTestCase: boolean;
  canExecuteTests: boolean;
  canCreateTestPlan: boolean;
  canEditTestPlan: boolean;
  canCreateDefect: boolean;
  canEditDefect: boolean;
  canDeleteDefect: boolean;
  canAssignDefect: boolean;
  canViewReports: boolean;
  canExportReports: boolean;
  canManageOrganization: boolean;
  canViewAnalytics: boolean;
}

const PERMISSIONS: Record<UserRole, UserPermissions> = {
  super_admin: {
    role: 'super_admin',
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: true,
    canInviteMembers: true,
    canManageRoles: true,
    canCreateRequirement: true,
    canEditRequirement: true,
    canDeleteRequirement: true,
    canCreateTestCase: true,
    canEditTestCase: true,
    canDeleteTestCase: true,
    canExecuteTests: true,
    canCreateTestPlan: true,
    canEditTestPlan: true,
    canCreateDefect: true,
    canEditDefect: true,
    canDeleteDefect: true,
    canAssignDefect: true,
    canViewReports: true,
    canExportReports: true,
    canManageOrganization: true,
    canViewAnalytics: true,
  },
  org_admin: {
    role: 'org_admin',
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: true,
    canInviteMembers: true,
    canManageRoles: true,
    canCreateRequirement: true,
    canEditRequirement: true,
    canDeleteRequirement: true,
    canCreateTestCase: true,
    canEditTestCase: true,
    canDeleteTestCase: true,
    canExecuteTests: true,
    canCreateTestPlan: true,
    canEditTestPlan: true,
    canCreateDefect: true,
    canEditDefect: true,
    canDeleteDefect: true,
    canAssignDefect: true,
    canViewReports: true,
    canExportReports: true,
    canManageOrganization: true,
    canViewAnalytics: true,
  },
  qa_manager: {
    role: 'qa_manager',
    canCreateProject: true,
    canEditProject: true,
    canDeleteProject: false,
    canInviteMembers: false,
    canManageRoles: false,
    canCreateRequirement: true,
    canEditRequirement: true,
    canDeleteRequirement: false,
    canCreateTestCase: true,
    canEditTestCase: true,
    canDeleteTestCase: true,
    canExecuteTests: true,
    canCreateTestPlan: true,
    canEditTestPlan: true,
    canCreateDefect: true,
    canEditDefect: true,
    canDeleteDefect: true,
    canAssignDefect: true,
    canViewReports: true,
    canExportReports: true,
    canManageOrganization: false,
    canViewAnalytics: true,
  },
  qa_engineer: {
    role: 'qa_engineer',
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canInviteMembers: false,
    canManageRoles: false,
    canCreateRequirement: false,
    canEditRequirement: false,
    canDeleteRequirement: false,
    canCreateTestCase: true,
    canEditTestCase: true,
    canDeleteTestCase: false,
    canExecuteTests: true,
    canCreateTestPlan: false,
    canEditTestPlan: false,
    canCreateDefect: true,
    canEditDefect: false,
    canDeleteDefect: false,
    canAssignDefect: false,
    canViewReports: true,
    canExportReports: false,
    canManageOrganization: false,
    canViewAnalytics: false,
  },
  developer: {
    role: 'developer',
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canInviteMembers: false,
    canManageRoles: false,
    canCreateRequirement: false,
    canEditRequirement: false,
    canDeleteRequirement: false,
    canCreateTestCase: false,
    canEditTestCase: false,
    canDeleteTestCase: false,
    canExecuteTests: false,
    canCreateTestPlan: false,
    canEditTestPlan: false,
    canCreateDefect: false,
    canEditDefect: true,
    canDeleteDefect: false,
    canAssignDefect: false,
    canViewReports: true,
    canExportReports: false,
    canManageOrganization: false,
    canViewAnalytics: false,
  },
  viewer: {
    role: 'viewer',
    canCreateProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canInviteMembers: false,
    canManageRoles: false,
    canCreateRequirement: false,
    canEditRequirement: false,
    canDeleteRequirement: false,
    canCreateTestCase: false,
    canEditTestCase: false,
    canDeleteTestCase: false,
    canExecuteTests: false,
    canCreateTestPlan: false,
    canEditTestPlan: false,
    canCreateDefect: false,
    canEditDefect: false,
    canDeleteDefect: false,
    canAssignDefect: false,
    canViewReports: true,
    canExportReports: false,
    canManageOrganization: false,
    canViewAnalytics: false,
  },
};

export function getPermissions(role: UserRole): UserPermissions {
  return PERMISSIONS[role];
}

export function hasPermission(role: UserRole, permission: keyof UserPermissions): boolean {
  return PERMISSIONS[role][permission] === true;
}

export function canAccessModule(role: UserRole, module: 'projects' | 'requirements' | 'test-cases' | 'test-plans' | 'test-execution' | 'defects' | 'reports' | 'ai-assistant' | 'settings'): boolean {
  const perms = PERMISSIONS[role];

  switch (module) {
    case 'projects':
      return perms.canCreateProject || perms.canEditProject || perms.canViewReports;
    case 'requirements':
      return perms.canCreateRequirement || perms.canEditRequirement || perms.canViewReports;
    case 'test-cases':
      return perms.canCreateTestCase || perms.canEditTestCase || perms.canViewReports;
    case 'test-plans':
      return perms.canCreateTestPlan || perms.canEditTestPlan || perms.canViewReports;
    case 'test-execution':
      return perms.canExecuteTests || perms.canViewReports;
    case 'defects':
      return perms.canCreateDefect || perms.canEditDefect || perms.canViewReports;
    case 'reports':
      return perms.canViewReports;
    case 'ai-assistant':
      return perms.role !== 'viewer';
    case 'settings':
      return perms.canManageOrganization || perms.canInviteMembers;
    default:
      return false;
  }
}



