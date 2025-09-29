import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, Check } from "lucide-react";

interface AccessibleTenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  role: string; // Role in this tenant
}

const fetchAccessibleTenants = async (): Promise<AccessibleTenant[]> => {
  const response = await authenticatedApiRequest('GET', '/api/tenants/accessible');
  if (!response.ok) {
    throw new Error('Failed to fetch accessible tenants');
  }
  return response.json();
};



interface TenantSwitcherProps {
  compact?: boolean;
  showButton?: boolean;
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({
  compact = false,
  showButton = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const { tenant: currentTenant, switchTenant } = useTenant();

  const { data: accessibleTenants, isLoading } = useQuery({
    queryKey: ['tenants', 'accessible'],
    queryFn: fetchAccessibleTenants,
    enabled: true, // Always enabled to determine if switcher should show
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === currentTenant?.id || isSwitching) return;

    setIsSwitching(true);
    try {
      const success = await switchTenant(tenantId);
      
      if (success) {
        // Close dialog
        setIsOpen(false);
        
        // Optionally reload the page to ensure clean state
        window.location.reload();
      } else {
        console.warn('Tenant switch failed, but fallback was applied');
        // Close dialog anyway as fallback was applied
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      // Could show toast notification here
    } finally {
      setIsSwitching(false);
    }
  };

  if (!showButton) return null;

  // Don't show switcher if no accessible tenants or only current tenant
  const availableTenants = accessibleTenants?.filter(tenant => tenant.id !== currentTenant?.id) || [];
  const shouldShowSwitcher = !isLoading && availableTenants.length > 0;

  if (!shouldShowSwitcher && !isLoading) return null;

  const trigger = compact ? (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-8 px-2" 
      disabled={isLoading || availableTenants.length === 0}
      title={availableTenants.length === 0 ? "No other organizations available" : "Switch organization"}
    >
      <Building2 className="w-4 h-4 mr-1" />
      <ChevronDown className="w-3 h-3" />
    </Button>
  ) : (
    <Button 
      variant="outline" 
      className="justify-start"
      disabled={isLoading || availableTenants.length === 0}
      title={availableTenants.length === 0 ? "No other organizations available" : "Switch organization"}
    >
      <Building2 className="w-4 h-4 mr-2" />
      Switch Organization
      <ChevronDown className="w-4 h-4 ml-auto" />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Switch Organization</DialogTitle>
          <DialogDescription>
            Select an organization to switch your context to.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Tenant */}
          {currentTenant && (
            <div>
              <h4 className="text-sm font-medium mb-2">Current Organization</h4>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">{currentTenant.name}</span>
                      <Badge variant={currentTenant.isActive ? "default" : "destructive"} className="text-xs">
                        {currentTenant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Available Tenants */}
          <div>
            <h4 className="text-sm font-medium mb-2">Available Organizations</h4>
            
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : accessibleTenants && accessibleTenants.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {accessibleTenants
                  .filter(tenant => tenant.id !== currentTenant?.id)
                  .map((tenant) => (
                    <Card
                      key={tenant.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleSwitchTenant(tenant.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{tenant.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Role: {tenant.role}
                              </p>
                            </div>
                            <Badge variant={tenant.isActive ? "default" : "destructive"} className="text-xs">
                              {tenant.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {isSwitching && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No other organizations available
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};