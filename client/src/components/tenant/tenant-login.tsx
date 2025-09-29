import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useTenantSlug } from '@/contexts/tenant-slug-context';
import { useTenant } from '@/hooks/use-tenant';
import Login from '@/pages/login';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface TenantLoginProps {
  slug: string;
}

export const TenantLogin: React.FC<TenantLoginProps> = ({ slug }) => {
  const { setSlug } = useTenantSlug();
  const [, setLocation] = useLocation();
  
  // Validate the provided slug by fetching tenant by slug
  const [isValidating, setIsValidating] = useState(true);
  const [isValidSlug, setIsValidSlug] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const validateSlug = async () => {
      try {
        const response = await fetch(`/api/tenants/slug/${slug}`);
        if (response.ok) {
          setIsValidSlug(true);
          setValidationError(null);
        } else {
          setIsValidSlug(false);
          setValidationError('Organization not found');
        }
      } catch (error) {
        setIsValidSlug(false);
        setValidationError('Failed to validate organization');
      } finally {
        setIsValidating(false);
      }
    };

    validateSlug();
  }, [slug]);

  useEffect(() => {
    if (isValidSlug) {
      // Set the current slug in context
      setSlug(slug);
      
      // Store slug in localStorage for authentication service to use
      localStorage.setItem('currentTenantSlug', slug);
    }
  }, [slug, setSlug, isValidSlug]);

  // Show loading while validating tenant slug
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organization information...</p>
        </div>
      </div>
    );
  }

  // Show error if slug is invalid
  if (!isValidSlug || validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Organization Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The organization "{slug}" could not be found or is not available.
            </p>
            <button
              onClick={() => setLocation('/login')}
              className="text-primary hover:underline text-sm"
            >
              Go to main login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Always render Login component with tenant-specific redirect
  return <Login redirectTo={`/${slug}/dashboard`} />;
};