import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiGet } from '../api/client';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  phone?: string | null;
  grade?: string | null;
  section?: string | null;
  allergies?: string | null;
};

type AuthState = {
  user: AppUser | null;
  loading: boolean;
  loginWithEmail: (email: string) => Promise<{ found: boolean; serverError?: boolean }>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = 'edueats_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const loginWithEmail = async (email: string) => {
    setLoading(true);
    try {
      const data = await apiGet<AppUser | null>(`/users/email/${encodeURIComponent(email)}`);
      if (!data) { setLoading(false); return { found: false }; }
      setUser(data);
      setLoading(false);
      return { found: true };
    } catch {
      setLoading(false);
      return { found: false, serverError: true };
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
