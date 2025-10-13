import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTenantSlug } from '@/contexts/tenant-slug-context';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/contexts/auth-context';
import { TenantStatusGuard } from '@/components/tenant/tenant-status-guard';
import { TenantAwareApp } from '@/components/tenant/tenant-aware-app';
import { InvalidTenantFallback } from '@/components/tenant/invalid-tenant-fallback';
import Footer from '@/components/layout/footer';

/**
 * TenantProtectedRoute works correctly with the enhanced authentication flow:
 * 
 * 1. Separation of concerns:
 *    - TenantProtectedRoute handles **client-side navigation** when isAuthenticated is false (lines 31-36)
 *    - authenticatedApiRequest in client/src/lib/auth.ts handles **forced redirects** when token refresh fails
 * 
 * 2. How they work together:
 *    - When a user first loads a protected route without being authenticated, TenantProtectedRoute redirects them to /:slug/login using wouter's setLocation
 *    - When a user is authenticated but their token expires during API requests, authenticatedApiRequest attempts to refresh the token
 *    - If refresh succeeds, the user stays on the page and the request succeeds
 *    - If refresh fails, authenticatedApiRequest uses window.location.href to force a full page reload to /:slug/login, which clears the stale auth state
 * 
 * 3. Why window.location.href is used in auth.ts:
 *    - Forces a complete page reload, ensuring AuthProvider in client/src/contexts/auth-context.tsx re-initializes with the cleared auth state
 *    - Prevents any stale React state from persisting
 *    - Works independently of the routing library (wouter)
 * 
 * 4. Why setLocation is used in TenantProtectedRoute:
 *    - Provides smooth client-side navigation for initial auth checks
 *    - Avoids unnecessary full page reloads when the user simply hasn't logged in yet
 *    - Works within the React component lifecycle
 */

interface TenantProtectedRouteProps {
  component: React.ComponentType;
  slug: string;
}

export const TenantProtectedRoute: React.FC<TenantProtectedRouteProps> = ({ 
  component: Component, 
  slug 
}) => {
  const [, setLocation] = useLocation();
  const { setSlug } = useTenantSlug();
  const { isAuthenticated } = useAuth();
  const { tenant, isLoading, error, isValidTenantContext } = useTenant(slug);

  useEffect(() => {
    // Set the current slug in context and localStorage
    setSlug(slug);
    localStorage.setItem('currentTenantSlug', slug);
  }, [slug, setSlug]);

  // Perform redirect in useEffect to avoid side effects during render
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation(`/${slug}/login`);
      return;
    }
  }, [isAuthenticated, slug, setLocation]);

  // Show loading state while tenant validation is in progress
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Validating organization...</p>
        </div>
      </div>
    );
  }

  // Show error fallback when tenant slug is invalid or doesn't match authenticated tenant
  if (error || !tenant || !isValidTenantContext) {
    console.error('Invalid tenant context or error fetching tenant:', isValidTenantContext);
    return <InvalidTenantFallback slug={slug} />;
  }

  // Render placeholder while redirect effect runs
  if (!isAuthenticated) {
    return null;
  }

  return (
    <TenantStatusGuard>
      <TenantAwareApp slug={slug}>
        <Component />
      </TenantAwareApp>
      <Footer />
    </TenantStatusGuard>
  );
};