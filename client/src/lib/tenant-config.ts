import { TenantSettings } from "@/types";

export interface TenantBranding {
  logoUrl?: string;
  favicon?: string;
}

export const getTenantBranding = (settings: TenantSettings): TenantBranding => {
  const branding = settings.branding || {};
  
  return {
    logoUrl: branding.logoUrl,
    favicon: branding.favicon ?? branding.logoUrl, // Use explicit favicon or fall back to logo
  };
};