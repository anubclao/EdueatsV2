import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AuthStartResponse, User } from '../types';
import { db } from '../services/db';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  startOtpLogin: (identifier: string) => Promise<AuthStartResponse>;
  verifyOtpLogin: (challengeId: string, otp: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, []);

  const refreshUser = async () => {
    try {
      const me = await db.authMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  const startOtpLogin = async (identifier: string): Promise<AuthStartResponse> => {
    const response = await db.authStart(identifier);
    return response;
  };

  const verifyOtpLogin = async (challengeId: string, otp: string): Promise<boolean> => {
    const response = await db.authVerifyOtp(challengeId, otp);
    if (response.success) {
      setUser(response.user);
      return true;
    }
    return false;
  };

  const logout = () => {
    db.authLogout().catch(() => undefined);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, startOtpLogin, verifyOtpLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
