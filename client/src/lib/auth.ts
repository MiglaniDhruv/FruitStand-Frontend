import { apiRequest } from "./queryClient";
import { TenantSessionContext } from "@/types";

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  tenantId: string;
  permissions?: string[];
}



export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse & { redirectTo?: string }> {
    // Extract tenant slug from URL path
    const tenantPathMatch = typeof window !== 'undefined'
      ? window.location.pathname.match(/^\/([^\/]+)\/login\/?$/)
      : null;
    const slugFromUrl = tenantPathMatch?.[1] ?? null;

    let tenantSlug: string | null = slugFromUrl || localStorage.getItem('currentTenantSlug');
    if (slugFromUrl && localStorage.getItem('currentTenantSlug') !== slugFromUrl) {
      localStorage.setItem('currentTenantSlug', slugFromUrl);
    }

    // Always require tenant slug for authentication
    if (!tenantSlug) {
      throw new Error('Tenant context is required for authentication');
    }

    // Always use tenant-scoped API endpoint
    const apiEndpoint = `/${tenantSlug}/api/auth/login`;
    
    const response = await apiRequest("POST", apiEndpoint, {
      username,
      password,
    });
    const data = await response.json();
    
    // Store token and user data (including tenantId) in localStorage
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    // Always redirect to tenant dashboard
    const redirectTo = `/${tenantSlug}/dashboard`;
    return { ...data, redirectTo };
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentTenantSlug");
  },

  getToken(): string | null {
    return localStorage.getItem("token");
  },

  getCurrentUser(): User | null {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  hasRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  },

  getTenantId(): string | null {
    const user = this.getCurrentUser();
    return user?.tenantId || null;
  },

  validateTenant(): boolean {
    const user = this.getCurrentUser();
    return !!(user && user.tenantId);
  },

  async validateTenantStatus(): Promise<boolean> {
    try {
      const response = await authenticatedApiRequest("GET", "/api/tenants/current");
      const tenant = await response.json();
      return tenant.isActive;
    } catch (error) {
      console.error("Failed to validate tenant status:", error);
      return false;
    }
  },

  getTenantContext(): TenantSessionContext | null {
    const user = this.getCurrentUser();
    if (!user || !user.tenantId) {
      return null;
    }
    
    return {
      user,
      tenantId: user.tenantId,
    };
  },

  applyNewToken(token: string, user?: User): void {
    localStorage.setItem("token", token);
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  },
};

// Add token to all API requests
export const authenticatedApiRequest = async (
  method: string,
  url: string,
  data?: unknown
): Promise<Response> => {
  const token = authService.getToken();
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    // Handle authentication/authorization errors
    if (res.status === 401) {
      // Capture tenant slug BEFORE invoking logout()
      const currentTenantSlug = localStorage.getItem('currentTenantSlug');
      
      // Clear invalid token and user data
      authService.logout();
      
      // Always redirect to tenant login page
      if (typeof window !== 'undefined') {
        window.location.href = currentTenantSlug ? `/${currentTenantSlug}/login` : '/login';
      }
      
      throw new Error(`Authentication failed: ${res.statusText}`);
    }
    
    if (res.status === 403) {
      // Don't logout for 403 errors - return rejected promise with parsed error
      // Let guards/pages handle navigation appropriately
      try {
        const errorData = await res.json();
        const error = new Error(errorData.message || "Access denied");
        (error as any).code = errorData.code;
        
        throw error;
      } catch (parseError) {
        throw new Error("Access denied");
      }
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
};
