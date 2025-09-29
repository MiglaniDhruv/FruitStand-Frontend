import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authService, authenticatedApiRequest } from "@/lib/auth";
import { TenantInfo, TenantSettings } from "@/types";

const fetchTenantInfo = async (): Promise<TenantInfo> => {
  const response = await authenticatedApiRequest('GET', '/api/tenants/current');
  if (!response.ok) {
    if (response.status === 403) {
      // Handle tenant-related 403 specifically
      try {
        const errorData = await response.json();
        if (errorData.message && errorData.message.includes('tenant')) {
          throw new Error("Your organization's access has been suspended. Please contact support.");
        }
      } catch (parseError) {
        // If we can't parse the error, fall through to generic handling
      }
    }
    throw new Error('Failed to fetch tenant information');
  }
  return response.json();
};

const fetchTenantBySlug = async (slug: string): Promise<TenantInfo> => {
  const response = await fetch(`/api/tenants/slug/${slug}`);
  if (!response.ok) {
    throw new Error('Failed to fetch tenant by slug');
  }
  return response.json();
};

export const useTenant = (slug?: string) => {
  const queryClient = useQueryClient();
  const tenantId = authService.getTenantId();
  
  const effectiveTenantId = tenantId;
  
  // When slug is provided, fetch tenant by slug and validate against authenticated tenant
  const query = useQuery({
    queryKey: slug ? ['tenant-by-slug', slug] : ['tenant', effectiveTenantId],
    queryFn: slug ? () => fetchTenantBySlug(slug) : () => fetchTenantInfo(),
    enabled: slug ? true : !!effectiveTenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Validate that fetched tenant matches authenticated tenant when slug is provided
  const isValidTenantContext = slug ? (
    query.data && authService.getTenantId() === query.data.id
  ) : true;

  const getTenantInfo = (): TenantInfo | undefined => {
    return query.data;
  };

  const getTenantSettings = (): TenantSettings => {
    return query.data?.settings || {};
  };

  const isTenantActive = (): boolean => {
    return query.data?.isActive ?? false;
  };

  const refreshTenantData = () => {
    query.refetch();
  };

  const switchTenant = async (newTenantId: string) => {
    try {
      // Try to get a new token for the selected tenant
      const response = await authenticatedApiRequest('POST', '/api/auth/switch-tenant', {
        tenantId: newTenantId,
      });
      
      if (response.ok) {
        const { token } = await response.json();
        // Update stored token
        localStorage.setItem('token', token);
      } else {
        console.error('Failed to switch tenant via API');
        return false;
      }
      
      // Invalidate all tenant-related queries
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
      
      // Refresh current query
      await query.refetch();
      
      return true;
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      return false;
    }
  };

  return {
    tenant: query.data,
    isLoading: query.isLoading,
    error: query.error || (!isValidTenantContext ? new Error('Invalid tenant context') : null),
    getTenantInfo,
    getTenantSettings,
    isTenantActive,
    refreshTenantData,
    switchTenant,
    isValidTenantContext,
  };
};