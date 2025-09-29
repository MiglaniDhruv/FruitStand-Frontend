import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TenantSlugContextType {
  slug: string;
  setSlug: (slug: string) => void;
}

const TenantSlugContext = createContext<TenantSlugContextType | undefined>(undefined);

interface TenantSlugProviderProps {
  children: ReactNode;
  slug?: string;
}

export const TenantSlugProvider: React.FC<TenantSlugProviderProps> = ({ 
  children, 
  slug: initialSlug = '' 
}) => {
  const [slug, setSlug] = useState<string>(initialSlug);

  return (
    <TenantSlugContext.Provider value={{ slug, setSlug }}>
      {children}
    </TenantSlugContext.Provider>
  );
};

export const useTenantSlug = (): TenantSlugContextType => {
  const context = useContext(TenantSlugContext);
  if (context === undefined) {
    throw new Error('useTenantSlug must be used within a TenantSlugProvider');
  }
  return context;
};