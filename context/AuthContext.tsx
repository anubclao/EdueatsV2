import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Role } from '../types';
import { db } from '../services/db';

interface AuthContextType {
  user: User | null;
  login: (role: Role, grade?: number) => void;
  loginWithEmail: (email: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('edueats_user');
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem('edueats_user');
    }
  }, []);

  const refreshUser = async () => {
    if (!user) return;
    const updatedUser = await db.findUserByEmail(user.email);
    if (updatedUser) {
      setUser(updatedUser);
      localStorage.setItem('edueats_user', JSON.stringify(updatedUser));
    }
  };

  // Demo login (un clic)
  const login = (role: Role, grade?: number) => {
    const newUser: User = {
      id: role === 'admin' ? 'super-admin-01' : `student-${Math.floor(Math.random() * 1000)}`,
      name: role === 'admin' ? 'Super Admin' : 'Bart Simpson',
      email: role === 'admin' ? 'superadmin@edueats.com' : 'student@edueats.com',
      role,
      grade,
      emailVerified: true,
    };
    setUser(newUser);
    localStorage.setItem('edueats_user', JSON.stringify(newUser));
  };

  // Login real con email
  const loginWithEmail = async (email: string): Promise<boolean> => {
    const foundUser = await db.findUserByEmail(email);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('edueats_user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('edueats_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithEmail, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
