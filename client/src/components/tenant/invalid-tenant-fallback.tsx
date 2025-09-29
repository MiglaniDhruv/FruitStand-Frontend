import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, Mail } from 'lucide-react';

interface InvalidTenantFallbackProps {
  slug?: string;
}

export const InvalidTenantFallback: React.FC<InvalidTenantFallbackProps> = ({ slug }) => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Organization Not Found
          </h1>
          {slug && (
            <p className="text-gray-600 mb-4">
              The organization "<span className="font-semibold text-gray-800">{slug}</span>" could not be found or is not available.
            </p>
          )}
          <div className="space-y-4 mt-6">
            <p className="text-sm text-gray-500">
              This could happen if:
            </p>
            <ul className="text-sm text-gray-500 text-left space-y-1">
              <li>• The organization link is incorrect</li>
              <li>• The organization has been suspended</li>
              <li>• The organization no longer exists</li>
            </ul>
          </div>
          
          <div className="mt-8 space-y-3">
            <Button
              onClick={() => setLocation('/login')}
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Main Login
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">
                Need help? Contact support:
              </p>
              <a
                href="mailto:support@apmcsystem.com"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <Mail className="w-3 h-3 mr-1" />
                support@apmcsystem.com
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};