import { authService } from "./auth";

type PermissionKey = keyof typeof PERMISSIONS;

// Define all available permissions in the system
export const PERMISSIONS = {
  // User Management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  
  // Vendor Management
  MANAGE_VENDORS: 'manage_vendors',
  VIEW_VENDORS: 'view_vendors',
  DELETE_VENDORS: 'delete_vendors',
  
  // Item Management
  MANAGE_ITEMS: 'manage_items',
  VIEW_ITEMS: 'view_items',
  DELETE_ITEMS: 'delete_items',
  
  // Purchase Invoices
  CREATE_PURCHASE_INVOICES: 'create_purchase_invoices',
  VIEW_PURCHASE_INVOICES: 'view_purchase_invoices',
  EDIT_PURCHASE_INVOICES: 'edit_purchase_invoices',
  DELETE_PURCHASE_INVOICES: 'delete_purchase_invoices',
  
  // Payments
  CREATE_PAYMENTS: 'create_payments',
  VIEW_PAYMENTS: 'view_payments',
  EDIT_PAYMENTS: 'edit_payments',
  DELETE_PAYMENTS: 'delete_payments',
  
  // Stock Management
  MANAGE_STOCK: 'manage_stock',
  VIEW_STOCK: 'view_stock',
  
  // Financial Reports & Ledgers
  VIEW_LEDGERS: 'view_ledgers',
  VIEW_REPORTS: 'view_reports',
  VIEW_CASHBOOK: 'view_cashbook',
  VIEW_BANKBOOK: 'view_bankbook',
  
  // Bank Accounts
  MANAGE_BANK_ACCOUNTS: 'manage_bank_accounts',
  VIEW_BANK_ACCOUNTS: 'view_bank_accounts',
  
  // System Settings
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_SETTINGS: 'view_settings',
  
  // Dashboard & Analytics
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_ANALYTICS: 'view_analytics',
} as const;

// Define permissions for each role
export const ROLE_PERMISSIONS = {
  Admin: [
    // Full system access
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_VENDORS,
    PERMISSIONS.VIEW_VENDORS,
    PERMISSIONS.DELETE_VENDORS,
    PERMISSIONS.MANAGE_ITEMS,
    PERMISSIONS.VIEW_ITEMS,
    PERMISSIONS.DELETE_ITEMS,
    PERMISSIONS.CREATE_PURCHASE_INVOICES,
    PERMISSIONS.VIEW_PURCHASE_INVOICES,
    PERMISSIONS.EDIT_PURCHASE_INVOICES,
    PERMISSIONS.DELETE_PURCHASE_INVOICES,
    PERMISSIONS.CREATE_PAYMENTS,
    PERMISSIONS.VIEW_PAYMENTS,
    PERMISSIONS.EDIT_PAYMENTS,
    PERMISSIONS.DELETE_PAYMENTS,
    PERMISSIONS.MANAGE_STOCK,
    PERMISSIONS.VIEW_STOCK,
    PERMISSIONS.VIEW_LEDGERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_CASHBOOK,
    PERMISSIONS.VIEW_BANKBOOK,
    PERMISSIONS.MANAGE_BANK_ACCOUNTS,
    PERMISSIONS.VIEW_BANK_ACCOUNTS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  
  Operator: [
    // Operations focused permissions
    PERMISSIONS.VIEW_VENDORS,
    PERMISSIONS.MANAGE_VENDORS, // Can add/edit vendors
    PERMISSIONS.VIEW_ITEMS,
    PERMISSIONS.MANAGE_ITEMS, // Can add/edit items
    PERMISSIONS.CREATE_PURCHASE_INVOICES,
    PERMISSIONS.VIEW_PURCHASE_INVOICES,
    PERMISSIONS.EDIT_PURCHASE_INVOICES,
    PERMISSIONS.CREATE_PAYMENTS,
    PERMISSIONS.VIEW_PAYMENTS,
    PERMISSIONS.MANAGE_STOCK,
    PERMISSIONS.VIEW_STOCK,
    PERMISSIONS.VIEW_LEDGERS,
    PERMISSIONS.VIEW_BANK_ACCOUNTS,
    PERMISSIONS.VIEW_DASHBOARD,
  ],
  
  Accountant: [
    // Finance focused permissions
    PERMISSIONS.VIEW_VENDORS,
    PERMISSIONS.VIEW_ITEMS,
    PERMISSIONS.VIEW_PURCHASE_INVOICES,
    PERMISSIONS.CREATE_PAYMENTS,
    PERMISSIONS.VIEW_PAYMENTS,
    PERMISSIONS.EDIT_PAYMENTS,
    PERMISSIONS.VIEW_STOCK,
    PERMISSIONS.VIEW_LEDGERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_CASHBOOK,
    PERMISSIONS.VIEW_BANKBOOK,
    PERMISSIONS.VIEW_BANK_ACCOUNTS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
} as const;

// Permission checking utilities
export const permissionService = {
  /**
   * Check if current user has a specific permission
   */
  hasPermission(permission: string): boolean {
    const user = authService.getCurrentUser();
    if (!user) return false;
    
    const rolePermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS];
    return rolePermissions ? rolePermissions.includes(permission as any) : false;
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
    
    return ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
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