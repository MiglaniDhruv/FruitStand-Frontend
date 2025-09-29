import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTenantSlug } from '@/contexts/tenant-slug-context';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/contexts/auth-context';
import { TenantStatusGuard } from '@/components/tenant/tenant-status-guard';
import { TenantAwareApp } from '@/components/tenant/tenant-aware-app';
import { InvalidTenantFallback } from '@/components/tenant/invalid-tenant-fallback';

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
    </TenantStatusGuard>
  );
};