'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, setAccessToken, ApiError } from './api-client';

export type UserRole = 'SUPER_ADMIN' | 'BROKERAGE_ADMIN' | 'BROKER' | 'AGENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  organizationId: string;
  organization?: Organization;
}

export interface Organization {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  ornNumber?: string | null;
  tradeLicenseNo?: string | null;
  address?: string | null;
  logoUrl?: string | null;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  organizationName?: string;
  role?: 'BROKERAGE_ADMIN' | 'BROKER' | 'AGENT';
}

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  role: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  simulateSwitchRole: (targetRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that do not require authentication
const PUBLIC_ROUTES = ['/login', '/register'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  const refreshSession = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
        setOrganization(res.user.organization || null);
      } else {
        setUser(null);
        setOrganization(null);
        setAccessToken(null);
      }
    } catch {
      setUser(null);
      setOrganization(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();

    // Listen for global session expiry events
    const handleSessionExpired = () => {
      setUser(null);
      setOrganization(null);
      setAccessToken(null);
      if (!PUBLIC_ROUTES.includes(pathname)) {
        router.push(`/login?expired=true&from=${encodeURIComponent(pathname)}`);
      }
    };

    window.addEventListener('admatrix:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('admatrix:session-expired', handleSessionExpired);
    };
  }, [refreshSession, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      if (res.success && res.user) {
        // Store access token in-memory only (Never in localStorage)
        setAccessToken(res.accessToken);
        setUser(res.user);
        setOrganization(res.user.organization || null);
        return { success: true };
      }
      return { success: false, error: res.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid credentials' };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const res = await apiClient.post('/auth/register', data);
      if (res.success && res.user) {
        setAccessToken(res.accessToken);
        setUser(res.user);
        setOrganization(res.user.organization || null);
        return { success: true };
      }
      return { success: false, error: res.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      setUser(null);
      setOrganization(null);
      setAccessToken(null);
      router.push('/login');
    }
  };

  // Quick Account Switcher for seamless demo & testing of all 4 roles
  const simulateSwitchRole = async (targetRole: UserRole) => {
    const roleCredentials: Record<UserRole, { email: string }> = {
      SUPER_ADMIN: { email: 'superadmin@admatrixplatform.ae' },
      BROKERAGE_ADMIN: { email: 'admin@apexrealty.ae' },
      BROKER: { email: 'sarah@apexrealty.ae' },
      AGENT: { email: 'junior@apexrealty.ae' },
    };

    const target = roleCredentials[targetRole];
    if (target) {
      const res = await login(target.email, 'Password123!');
      if (res.success) {
        router.refresh();
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        role: user?.role || null,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshSession,
        simulateSwitchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

