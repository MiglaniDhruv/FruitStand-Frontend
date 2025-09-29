import { useEffect } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { applyTenantTheme, resetTenantTheme, getTenantBranding } from '@/lib/tenant-config';

interface TenantAwareAppProps {
  children: React.ReactNode;
  slug?: string;
}

export const TenantAwareApp: React.FC<TenantAwareAppProps> = ({ children, slug }) => {
  const { tenant } = useTenant();
  
  useEffect(() => {
    const originalTitle = document.title;
    const originalFavicon = document.querySelector('link[rel="icon"]')?.getAttribute('href');
    
    if (tenant?.settings) {
      applyTenantTheme(tenant.settings);
      
      const branding = getTenantBranding(tenant.settings);
      
      // Update document title with tenant/company name
      if (branding.companyName) {
        document.title = `${branding.companyName} - APMC System`;
      }
      
      // Update favicon if tenant has one
      if (branding.favicon) {
        let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!faviconLink) {
          faviconLink = document.createElement('link');
          faviconLink.rel = 'icon';
          document.head.appendChild(faviconLink);
        }
        faviconLink.href = branding.favicon;
      }
    } else {
      resetTenantTheme();
    }
    
    return () => {
      resetTenantTheme();
      
      // Reset title and favicon
      document.title = originalTitle;
      if (originalFavicon) {
        let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (faviconLink) {
          faviconLink.href = originalFavicon;
        }
      }
    };
  }, [tenant]);
  
  return <>{children}</>;
};