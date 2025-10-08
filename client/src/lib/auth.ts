import { apiRequest } from "./queryClient";
import { TenantSessionContext } from "@/types";
import { toast } from "@/hooks/use-toast";
import { 
  ApiError,
  NetworkError, 
  TimeoutError, 
  ServerError, 
  ValidationError, 
  AuthError, 
  NotFoundError,
  isNetworkError 
} from "./api-errors";
import { fetchWithTimeout, DEFAULT_REQUEST_TIMEOUT } from "./request-timeout";
import { withRetry, shouldRetry } from "./retry-logic";
import { getUserFriendlyMessage, getToastConfig, shouldShowToast } from "./error-messages";
import { logApiError } from "./error-logger";

// Add helper at top of file
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD']);

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

export const authenticatedApiRequest = async (method: string, url: string, data?: unknown, isRetrying = false): Promise<Response> => {
  if (isRetrying) {
    return await makeAuthenticatedRequest(method, url, data, isRetrying);
  }
  const run = () => makeAuthenticatedRequest(method, url, data, false);
  return IDEMPOTENT_METHODS.has(method.toUpperCase()) ? withRetry(run, {
    onGiveUp: (error) => {
      if (shouldShowToast(error, 'api')) toast(getToastConfig(error));
    }
  }) : run();
};

const makeAuthenticatedRequest = async (
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

  try {
    const res = await fetchWithTimeout(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    }, DEFAULT_REQUEST_TIMEOUT);

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
          
          const authError = new AuthError('Authentication failed', 401);
          throw authError;
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
            
            const authError = new AuthError('Authentication failed', 401);
            throw authError;
          }
        }
      }
      
      if (res.status === 403) {
        // Don't logout for 403 errors - return rejected promise with parsed error
        // Let guards/pages handle navigation appropriately
        try {
          const errorData = await res.json();
          const authError = new AuthError(errorData.message || "Access denied", 403);
          logApiError(authError, url, method);
          if (shouldShowToast(authError, 'api')) {
            const toastConfig = getToastConfig(authError);
            toast(toastConfig);
          }
          throw authError;
        } catch (parseError) {
          const authError = new AuthError("Access denied", 403);
          logApiError(authError, url, method);
          if (shouldShowToast(authError, 'api')) {
            const toastConfig = getToastConfig(authError);
            toast(toastConfig);
          }
          throw authError;
        }
      }
      
      // Handle 400 validation errors
      if (res.status === 400) {
        try {
          const errorData = await res.json();
          const validationError = new ValidationError(
            errorData.message || "Invalid data provided", 
            errorData.errors || errorData.validationErrors
          );
          logApiError(validationError, url, method);
          if (shouldShowToast(validationError, 'api')) {
            const toastConfig = getToastConfig(validationError);
            toast(toastConfig);
          }
          throw validationError;
        } catch (parseError) {
          const validationError = new ValidationError("Invalid data provided");
          logApiError(validationError, url, method);
          if (shouldShowToast(validationError, 'api')) {
            const toastConfig = getToastConfig(validationError);
            toast(toastConfig);
          }
          throw validationError;
        }
      }
      
      // Handle 404 errors
      if (res.status === 404) {
        const notFoundError = new NotFoundError("Resource not found");
        logApiError(notFoundError, url, method);
        if (shouldShowToast(notFoundError, 'api')) {
          const toastConfig = getToastConfig(notFoundError);
          toast(toastConfig);
        }
        throw notFoundError;
      }
      
      if (res.status === 429) {
        // Read Retry-After header
        const retryAfter = res.headers.get('Retry-After');
        let retryAfterMs: number | undefined;
        
        if (retryAfter) {
          // Try parsing as seconds first
          const retryAfterSeconds = parseInt(retryAfter, 10);
          if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
            retryAfterMs = retryAfterSeconds * 1000;
          } else {
            // Try parsing as HTTP date
            const retryAfterDate = Date.parse(retryAfter);
            if (!isNaN(retryAfterDate)) {
              const computedDelay = retryAfterDate - Date.now();
              if (computedDelay > 0) {
                retryAfterMs = computedDelay;
              }
            }
          }
        }
        
        const err = new ApiError('Rate limited', 429, 'RATE_LIMITED');
        // Mark retryable
        (err as any).isRetryable = true;
        if (retryAfterMs && retryAfterMs > 0) {
          (err as any).retryAfterMs = retryAfterMs;
        }
        logApiError(err, url, method);
        throw err;
      }
      
      // Handle 5xx server errors
      if (res.status >= 500) {
        const text = await res.text().catch(() => res.statusText);
        const serverError = new ServerError(
          text || `Server error (${res.status})`, 
          res.status
        );
        logApiError(serverError, url, method);
        throw serverError;
      }
      
      // After handling 400/401/403/404/5xx
      const text = await res.text().catch(() => res.statusText);
      const apiError = new ApiError(text || `HTTP ${res.status}`, res.status, 'HTTP_ERROR');
      logApiError(apiError, url, method);
      throw apiError;
    }

    return res;
  } catch (error) {
    // Handle network errors
    if (isNetworkError(error)) {
      const networkError = new NetworkError(
        "Unable to connect to the server. Please check your internet connection.",
        error instanceof Error ? error : undefined
      );
      logApiError(networkError, url, method);
      throw networkError;
    }
    
    // Handle timeout errors
    if (error instanceof TimeoutError) {
      logApiError(error, url, method);
      throw error;
    }
    
    // Re-throw already processed errors
    if (error instanceof AuthError || 
        error instanceof ValidationError || 
        error instanceof NotFoundError || 
        error instanceof ServerError) {
      throw error;
    }
    
    // Handle unexpected errors
    logApiError(error, url, method);
    throw error;
  }
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
