// mobile/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import storage from '../utils/storage';
import { authApi } from '../api/authApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, institution?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedToken = await storage.getToken();
      if (savedToken) {
        setToken(savedToken);
        const cached = await storage.getCachedUser();
        if (cached) setUser(cached);

        try {
          const res = await authApi.getMe();
          if (res && res.user) {
            setUser(res.user);
            await storage.saveCachedUser(res.user);
          }
        } catch {
          // Token expired or network issue
        }
      }
    } catch (e) {
      console.warn('Auth check error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    if (res.token && res.user) {
      await storage.saveToken(res.token);
      await storage.saveCachedUser(res.user);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const register = async (email: string, password: string, full_name: string, institution?: string) => {
    const res = await authApi.register({ email, password, full_name, institution });
    if (res.token && res.user) {
      await storage.saveToken(res.token);
      await storage.saveCachedUser(res.user);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore errors on logout
    } finally {
      await storage.clearAll();
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res && res.user) {
        setUser(res.user);
        await storage.saveCachedUser(res.user);
      }
    } catch (e) {
      console.warn('Failed to refresh user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
