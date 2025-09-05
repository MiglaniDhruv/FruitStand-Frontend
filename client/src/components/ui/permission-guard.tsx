import { ReactNode } from 'react';
import { permissionService, ROLE_PERMISSIONS } from '@/lib/permissions';

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Permission Guard Component
 * Conditionally renders children based on user permissions
 */
export function PermissionGuard({ 
  permission, 
  permissions = [], 
  requireAll = false, 
  fallback = null, 
  children 
}: PermissionGuardProps) {
  let hasAccess = false;

  if (permission) {
    hasAccess = permissionService.hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll 
      ? permissionService.hasAllPermissions(permissions)
      : permissionService.hasAnyPermission(permissions);
  } else {
    // If no permissions specified, allow access
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

interface RoleGuardProps {
  roles: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Role Guard Component
 * Conditionally renders children based on user role
 */
export function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
  const hasAccess = permissionService.hasAnyPermission(
    roles.flatMap(role => {
      const roleKey = role as keyof typeof ROLE_PERMISSIONS;
      return ROLE_PERMISSIONS[roleKey] || [];
    })
  );

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}