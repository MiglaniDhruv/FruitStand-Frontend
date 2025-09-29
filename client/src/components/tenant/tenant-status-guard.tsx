import React from "react";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Mail, Phone } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";

interface TenantStatusGuardProps {
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
  redirectTo?: string;
}

export const TenantStatusGuard: React.FC<TenantStatusGuardProps> = ({
  children,
  fallbackComponent,
  redirectTo,
}) => {


  const { tenant, isLoading, error } = useTenant();

  // Get support contact info from tenant settings or default config
  const getSupportInfo = () => {
    if (tenant?.settings?.support) {
      return {
        email: tenant.settings.support.email || APP_CONFIG.support.email,
        phone: tenant.settings.support.phone || APP_CONFIG.support.phone,
      };
    }
    return APP_CONFIG.support;
  };

  const supportInfo = getSupportInfo();

  // Show loading state while fetching tenant data
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organization information...</p>
        </div>
      </div>
    );
  }

  // Show error state if tenant data couldn't be loaded
  if (error || !tenant) {
    // Check if error message contains "suspended" and show suspended UI
    const errorMessage = error?.message || "";
    if (errorMessage.includes("suspended")) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Access Suspended
              </h2>
              <p className="text-gray-600 mb-4">
                Your organization's access to the APMC System has been temporarily suspended.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Please contact your system administrator or our support team to reactivate your account.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{supportInfo.email}</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>{supportInfo.phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Organization Information Unavailable
            </h2>
            <p className="text-gray-600 mb-6">
              We're unable to load your organization information at this time. 
              Please try refreshing the page or contact support if the problem persists.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>{supportInfo.email}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>{supportInfo.phone}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show inactive tenant message if tenant is not active
  if (!tenant.isActive) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    if (redirectTo) {
      window.location.href = redirectTo;
      return null;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Access Suspended
            </h2>
            <p className="text-gray-600 mb-4">
              Your organization's access to the APMC System has been temporarily suspended.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">
                <strong>Organization:</strong> {tenant.name}
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Please contact your system administrator or our support team to reactivate your account.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>{supportInfo.email}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>{supportInfo.phone}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tenant is active, render children
  return <>{children}</>;
};