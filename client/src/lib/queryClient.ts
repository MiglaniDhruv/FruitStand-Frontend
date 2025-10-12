import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { authenticatedApiRequest, authService } from './auth';
import { AuthError } from './api-errors';
import { logApiError } from './error-logger';
import { redirectToLoginOnce } from './redirect-utils';

/**
 * Global error handler to catch token expiration across all React Query operations
 */
function handleGlobalError(error: unknown): void {
  if (error instanceof AuthError && error.statusCode === 401 && error.code === 'AUTH_TOKEN_EXPIRED') {
    // Capture current tenant slug before logout
    const tenantSlug = localStorage.getItem('currentTenantSlug');
    
    // Logout user
    authService.logout();
    
    // Redirect to tenant login page using shared helper
    const loginPath = tenantSlug ? `/${tenantSlug}/login` : '/login';
    redirectToLoginOnce(loginPath);
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

const queryFunction: QueryFunction = async ({ queryKey }) => {
  const url = queryKey.join('/') as string;
  try {
    const response = await authenticatedApiRequest('GET', url);
    return await response.json();
  } catch (error) {
    logApiError(error, url, 'GET');
    throw error;
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: queryFunction,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      onError: handleGlobalError,
    } as any,
    mutations: {
      retry: false,
      onError: handleGlobalError,
    } as any,
  },
});
