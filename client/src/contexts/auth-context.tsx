import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());

  const refreshAuth = () => {
    setIsAuthenticated(authService.isAuthenticated());
  };

  useEffect(() => {
    // Listen for storage changes (e.g., when login/logout happens)
    const handleStorageChange = () => {
      refreshAuth();
    };

    // Listen for window focus/visibility changes to re-check auth state
    const handleFocus = () => {
      refreshAuth();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};