'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api-client';

export type UserRole = 'STUDENT' | 'RECRUITER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  createdAt?: string;
  studentProfile?: {
    id: string;
    name: string;
    phone?: string;
    college?: string;
    department?: string;
  };
  recruiterProfile?: {
    id: string;
    name: string;
    phone?: string;
    designation?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    role: UserRole;
    name: string;
    college?: string;
    department?: string;
    designation?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async (authToken: string) => {
    try {
      const userData = await apiFetch<User>('/auth/me', { method: 'GET' }, authToken);
      setUser(userData);
    } catch {
      localStorage.removeItem('cs_access_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize auth state on load
  useEffect(() => {
    const savedToken = localStorage.getItem('cs_access_token');
    if (savedToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(savedToken);
      void fetchCurrentUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ user: User; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setUser(res.user);
      setToken(res.accessToken);
      localStorage.setItem('cs_access_token', res.accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    role: UserRole;
    name: string;
    college?: string;
    department?: string;
    designation?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ user: User; accessToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      setUser(res.user);
      setToken(res.accessToken);
      localStorage.setItem('cs_access_token', res.accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (token) {
        await apiFetch('/auth/logout', { method: 'POST' }, token).catch(() => {});
      }
    } finally {
      localStorage.removeItem('cs_access_token');
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    try {
      const res = await apiFetch<{ user: User; accessToken: string }>('/auth/refresh', {
        method: 'POST',
      });
      setUser(res.user);
      setToken(res.accessToken);
      localStorage.setItem('cs_access_token', res.accessToken);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('cs_access_token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        refreshAuth,
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
