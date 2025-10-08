import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'wouter';
import { ErrorFallbackProps } from './error-boundary';

export function ErrorFallback({ 
  error, 
  resetError, 
  showDetails = process.env.NODE_ENV === 'development' 
}: ErrorFallbackProps) {
  const [, setLocation] = useLocation();

  const handleGoToDashboard = () => {
    // Navigate to tenant dashboard or home
    const currentPath = window.location.pathname;
    const tenantMatch = currentPath.match(/^\/tenant\/([^\/]+)/);
    
    if (tenantMatch) {
      setLocation(`/tenant/${tenantMatch[1]}/dashboard`);
    } else {
      setLocation('/');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Error Message */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                {error.message}
              </code>
            </AlertDescription>
          </Alert>

          {/* Error Stack Trace (Development Only) */}
          {showDetails && error.stack && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Stack Trace (Development Mode)
              </h4>
              <ScrollArea className="h-32 w-full rounded border bg-muted p-3">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </ScrollArea>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button onClick={resetError} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGoToDashboard}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ErrorFallback;