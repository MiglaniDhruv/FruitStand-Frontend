import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { authService } from '@/lib/auth';
import { useTenantSlug } from '@/contexts/tenant-slug-context';

interface TenantLandingRedirectProps {
  slug: string;
}

export const TenantLandingRedirect: React.FC<TenantLandingRedirectProps> = ({ slug }) => {
  const [, setLocation] = useLocation();
  const { setSlug } = useTenantSlug();

  useEffect(() => {
    // Set the current slug in context
    setSlug(slug);

    // Check authentication status and redirect accordingly
    const isAuthenticated = authService.isAuthenticated();
    
    if (isAuthenticated) {
      // Redirect to tenant dashboard
      setLocation(`/${slug}/dashboard`);
    } else {
      // Redirect to tenant login
      setLocation(`/${slug}/login`);
    }
  }, [slug, setLocation, setSlug]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
};