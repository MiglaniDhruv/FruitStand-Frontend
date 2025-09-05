import { authService } from "./auth";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@shared/permissions";

// Re-export for compatibility
export { PERMISSIONS, ROLE_PERMISSIONS };

// Permission checking utilities
export const permissionService = {
  /**
   * Check if current user has a specific permission
   */
  hasPermission(permission: string): boolean {
    const user = authService.getCurrentUser();
    if (!user) return false;
    
    // Check individual user permissions first, fallback to role permissions
    const userPermissions = (user as any).permissions || ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS];
    return userPermissions ? userPermissions.includes(permission as any) : false;
  },

  /**
   * Check if current user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  },

  /**
   * Check if current user has all specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  },

  /**
   * Get all permissions for current user
   */
  getUserPermissions(): string[] {
    const user = authService.getCurrentUser();
    if (!user) return [];
    
    return (user as any).permissions || ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
  },

  /**
   * Check if user can access a specific route/page
   */
  canAccessRoute(route: string): boolean {
    const routePermissions: Record<string, string[]> = {
      '/users': [PERMISSIONS.VIEW_USERS, PERMISSIONS.MANAGE_USERS],
      '/vendors': [PERMISSIONS.VIEW_VENDORS],
      '/items': [PERMISSIONS.VIEW_ITEMS],
      '/purchase-invoices': [PERMISSIONS.VIEW_PURCHASE_INVOICES],
      '/payments': [PERMISSIONS.VIEW_PAYMENTS],
      '/stock': [PERMISSIONS.VIEW_STOCK],
      '/ledgers': [PERMISSIONS.VIEW_LEDGERS],
      '/reports': [PERMISSIONS.VIEW_REPORTS],
      '/settings': [PERMISSIONS.VIEW_SETTINGS],
    };

    const requiredPermissions = routePermissions[route];
    if (!requiredPermissions) return true; // If no specific permissions required, allow access
    
    return this.hasAnyPermission(requiredPermissions);
  },

  /**
   * Get user role display information
   */
  getRoleInfo(): { role: string; label: string; color: string } {
    const user = authService.getCurrentUser();
    if (!user) return { role: '', label: 'Unknown', color: 'gray' };

    const roleInfo: Record<string, { label: string; color: string }> = {
      Admin: { label: 'Administrator', color: 'red' },
      Operator: { label: 'Operator', color: 'blue' },
      Accountant: { label: 'Accountant', color: 'green' },
    };

    return {
      role: user.role,
      label: roleInfo[user.role]?.label || user.role,
      color: roleInfo[user.role]?.color || 'gray',
    };
  },
};

// React hook for permissions (can be used in components)
export const usePermissions = () => {
  return {
    hasPermission: permissionService.hasPermission,
    hasAnyPermission: permissionService.hasAnyPermission,
    hasAllPermissions: permissionService.hasAllPermissions,
    getUserPermissions: permissionService.getUserPermissions,
    canAccessRoute: permissionService.canAccessRoute,
    getRoleInfo: permissionService.getRoleInfo,
  };
};