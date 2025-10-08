import { apiRequest } from "./queryClient";
import { TenantSessionContext } from "@/types";

// Module-level variables for token refresh coordination
let isRefreshing = false;
let refreshPromise: Promise<AuthResponse> | null = null;

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

  async refreshToken(): Promise<AuthResponse> {
    // Extract the tenant slug from localStorage
    const tenantSlug = localStorage.getItem('currentTenantSlug');
    if (!tenantSlug) {
      throw new Error('Tenant context required for token refresh');
    }

    // Construct the tenant-scoped refresh endpoint URL
    const refreshUrl = `/${tenantSlug}/api/auth/refresh`;
    
    // Make a POST request using fetch directly
    const res = await fetch(refreshUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send HttpOnly refresh token cookie
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Refresh token expired or invalid');
      }
      throw new Error(`Token refresh failed: ${res.statusText}`);
    }

    // Parse the JSON response to get { token, user }
    const data = await res.json();
    
    // Update localStorage with new token and user data
    this.applyNewToken(data.token, data.user);
    
    // Dispatch custom event to notify AuthProvider
    window.dispatchEvent(new CustomEvent('auth-token-refreshed'));
    
    return data;
  },
};

// Add token to all API requests
export const authenticatedApiRequest = async (
  method: string,
  url: string,
  data?: unknown,
  isRetrying: boolean = false
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
      // If this is a retry attempt, proceed with logout
      if (isRetrying) {
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

      // If already refreshing, await the existing promise and retry
      if (isRefreshing && refreshPromise) {
        try {
          await refreshPromise;
          return authenticatedApiRequest(method, url, data, true);
        } catch (error) {
          // Reset flags
          isRefreshing = false;
          refreshPromise = null;
          
          // Proceed with logout and redirect logic
          const currentTenantSlug = localStorage.getItem('currentTenantSlug');
          authService.logout();
          
          if (typeof window !== 'undefined') {
            window.location.href = currentTenantSlug ? `/${currentTenantSlug}/login` : '/login';
          }
          
          throw error;
        }
      }

      // If not retrying and not already refreshing, attempt token refresh
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          refreshPromise = authService.refreshToken();
          await refreshPromise;
          console.log('Token refreshed successfully, retrying request');
          
          // Reset flags
          isRefreshing = false;
          refreshPromise = null;
          
          // Retry the original request with the new token
          return authenticatedApiRequest(method, url, data, true);
        } catch (error) {
          // Reset flags
          isRefreshing = false;
          refreshPromise = null;
          
          console.error('Token refresh failed:', error);
          
          // Proceed with logout and redirect logic
          const currentTenantSlug = localStorage.getItem('currentTenantSlug');
          authService.logout();
          
          if (typeof window !== 'undefined') {
            window.location.href = currentTenantSlug ? `/${currentTenantSlug}/login` : '/login';
          }
          
          throw new Error(`Authentication failed: ${res.statusText}`);
        }
      }
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

// Public API request without authentication
export const publicApiRequest = async (
  method: string,
  url: string,
  data?: unknown
): Promise<Response> => {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
};
