import React, { useState } from 'react';
import { AlertCircle, RotateCcw, Home, RefreshCw, Bug, Copy, CheckCircle, Wifi, Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { ErrorFallbackProps } from './error-boundary';

export function ErrorFallback({ 
  error, 
  resetError, 
  showDetails = process.env.NODE_ENV === 'development' 
}: ErrorFallbackProps) {
  const [, setLocation] = useLocation();
  const [isRetrying, setIsRetrying] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      resetError();
    } catch {
      toast({
        title: "Retry failed",
        description: "Please try refreshing the page instead.",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

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

  const handleRefreshPage = () => {
    window.location.reload();
  };

  const handleCopyError = async () => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
      setCopied(true);
      toast({
        title: "Error details copied",
        description: "You can now share this with technical support.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Please manually copy the error details below.",
        variant: "destructive",
      });
    }
  };

  const getRecoverySteps = () => {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return [
        { icon: Wifi, text: "Check your internet connection" },
        { icon: RefreshCw, text: "Refresh the page to retry" },
        { icon: Settings, text: "Check if the server is accessible" }
      ];
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      return [
        { icon: Settings, text: "Check if you're logged in" },
        { icon: RefreshCw, text: "Try logging out and back in" },
        { icon: Home, text: "Return to the dashboard" }
      ];
    }
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return [
        { icon: Home, text: "Return to the dashboard" },
        { icon: RefreshCw, text: "Check if the URL is correct" },
        { icon: Settings, text: "Use the navigation menu instead" }
      ];
    }
    
    // Default recovery steps
    return [
      { icon: RefreshCw, text: "Refresh the page" },
      { icon: RotateCcw, text: "Try the action again" },
      { icon: Home, text: "Return to the dashboard" }
    ];
  };

  const recoverySteps = getRecoverySteps();

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <AlertCircle className="h-16 w-16 text-destructive animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
            </div>
          </div>
          <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
          <CardDescription>
            Don't worry, this happens sometimes. Here are some steps to get you back on track.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Recovery Steps */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Try these solutions:
            </h3>
            <div className="space-y-2">
              {recoverySteps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <step.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying}
              className="flex items-center gap-2"
            >
              {isRetrying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRefreshPage}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
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

          {/* Error Details */}
          <Collapsible open={showTechnicalDetails} onOpenChange={setShowTechnicalDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full flex items-center gap-2">
                <Bug className="h-4 w-4" />
                {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Error Message */}
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  Error Details
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyError}
                    className="h-auto p-1"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </AlertTitle>
                <AlertDescription className="mt-2">
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                    {error.message}
                  </code>
                </AlertDescription>
              </Alert>

              {/* Error Stack Trace */}
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

              {/* Additional Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Time: {new Date().toLocaleString()}</div>
                <div>URL: {window.location.href}</div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Support Note */}
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            Still having trouble? You can copy the technical details above and share them with support.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ErrorFallback;