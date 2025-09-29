import { TenantSettings } from "@/types";

export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
}

export interface TenantBranding {
  logoUrl?: string;
  companyName?: string;
  favicon?: string;
}

const DEFAULT_THEME: TenantTheme = {
  primaryColor: '#2563eb', // blue-600
  secondaryColor: '#64748b', // slate-500
  accentColor: '#059669', // emerald-600
};

const DEFAULT_BRANDING: TenantBranding = {
  companyName: 'APMC System',
};

export const getTenantTheme = (settings: TenantSettings): TenantTheme => {
  const branding = settings.branding || {};
  
  return {
    primaryColor: branding.primaryColor || DEFAULT_THEME.primaryColor,
    secondaryColor: branding.secondaryColor || DEFAULT_THEME.secondaryColor,
    accentColor: branding.primaryColor || DEFAULT_THEME.accentColor,
  };
};

export const getTenantBranding = (settings: TenantSettings): TenantBranding => {
  const branding = settings.branding || {};
  
  return {
    logoUrl: branding.logoUrl,
    companyName: branding.companyName || DEFAULT_BRANDING.companyName,
    favicon: branding.logoUrl, // Use logo as favicon fallback
  };
};

export const applyTenantTheme = (settings: TenantSettings): void => {
  const theme = getTenantTheme(settings);
  const root = document.documentElement;
  
  // Apply CSS custom properties for tenant-specific theming
  root.style.setProperty('--tenant-primary', theme.primaryColor);
  root.style.setProperty('--tenant-secondary', theme.secondaryColor);
  root.style.setProperty('--tenant-accent', theme.accentColor || theme.primaryColor);
  
  // Update CSS variables that shadcn/ui uses
  const hsl = hexToHsl(theme.primaryColor);
  if (hsl) {
    root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  }
};

export const resetTenantTheme = (): void => {
  const root = document.documentElement;
  root.style.removeProperty('--tenant-primary');
  root.style.removeProperty('--tenant-secondary');
  root.style.removeProperty('--tenant-accent');
  // Reset to default primary color
  root.style.setProperty('--primary', '221.2 83.2% 53.3%'); // Default blue
};

// Utility function to convert hex to HSL for shadcn/ui compatibility
const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Expand 3-char hex to 6-char (#abc -> #aabbcc)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Validate hex length
  if (hex.length !== 6) {
    return null;
  }
  
  // Convert hex to RGB
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number = 0;
  let s: number = 0;
  const l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};