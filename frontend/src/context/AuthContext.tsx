import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';
import type { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string; nic?: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          setUser(res.data);
        } catch {
          setToken(null);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  // The login/register/Google responses return a minimal user — pull the full
  // profile (NIC, annual fee, joined date, ...) so the UI is consistent without
  // a refresh
  const fetchProfile = async (newToken: string): Promise<User> => {
    const res = await api.get<User>('/auth/profile', {
      headers: { Authorization: `Bearer ${newToken}` },
    });
    return res.data;
  };

  // Shared session bootstrap for every sign-in method
  const applyAuth = async (userData: User, newToken: string): Promise<void> => {
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    try {
      const full = await fetchProfile(newToken);
      setUser(full);
      localStorage.setItem('user', JSON.stringify(full));
    } catch { /* keep the minimal user on failure */ }
  };

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    await applyAuth(res.data.user, res.data.token);
  };

  // Google Identity Services — the credential is the Google ID token,
  // verified server-side against GOOGLE_CLIENT_ID
  const loginWithGoogle = async (credential: string) => {
    const res = await api.post<AuthResponse>('/auth/google', { credential });
    await applyAuth(res.data.user, res.data.token);
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string; phone?: string; nic?: string }) => {
    const res = await api.post<AuthResponse>('/auth/register', data);
    await applyAuth(res.data.user, res.data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await api.put('/auth/profile', data);
    setUser(res.data);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, register, logout, updateProfile }}>
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
