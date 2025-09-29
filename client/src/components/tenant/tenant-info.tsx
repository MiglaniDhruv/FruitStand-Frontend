import React from "react";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, AlertCircle } from "lucide-react";
import { TenantSwitcher } from "./tenant-switcher";

interface TenantInfoProps {
  showStatus?: boolean;
  showLogo?: boolean;
  compact?: boolean;
  className?: string;
  showSwitcher?: boolean;
}

export const TenantInfo: React.FC<TenantInfoProps> = ({
  showStatus = true,
  showLogo = true,
  compact = false,
  className = "",
  showSwitcher = false,
}) => {
  const { tenant, isLoading, error } = useTenant();

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center space-x-2">
          {showLogo && <div className="w-8 h-8 bg-gray-200 rounded-full" />}
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
            {showStatus && <div className="h-3 bg-gray-200 rounded w-16" />}
          </div>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Tenant info unavailable</span>
      </div>
    );
  }

  const logoUrl = tenant.settings?.branding?.logoUrl;
  const companyName = tenant.settings?.branding?.companyName || tenant.name;

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLogo && (
          <Avatar className="w-6 h-6">
            {logoUrl ? (
              <AvatarImage src={logoUrl} alt={companyName} />
            ) : (
              <AvatarFallback className="bg-primary/10">
                <Building2 className="w-3 h-3" />
              </AvatarFallback>
            )}
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{companyName}</p>
          {showStatus && (
            <Badge
              variant={tenant.isActive ? "default" : "destructive"}
              className="text-xs"
            >
              {tenant.isActive ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
        {showSwitcher && (
          <TenantSwitcher compact={true} />
        )}
      </div>
    );
  }

  return (
    <Card className={`p-3 ${className}`}>
      <div className="flex items-center space-x-3">
        {showLogo && (
          <Avatar className="w-10 h-10">
            {logoUrl ? (
              <AvatarImage src={logoUrl} alt={companyName} />
            ) : (
              <AvatarFallback className="bg-primary/10">
                <Building2 className="w-5 h-5" />
              </AvatarFallback>
            )}
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{companyName}</h3>
          <p className="text-xs text-muted-foreground truncate">{tenant.slug}</p>
          {showStatus && (
            <Badge
              variant={tenant.isActive ? "default" : "destructive"}
              className="text-xs mt-1"
            >
              {tenant.isActive ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
        {showSwitcher && (
          <div className="ml-2">
            <TenantSwitcher compact={true} />
          </div>
        )}
      </div>
    </Card>
  );
};