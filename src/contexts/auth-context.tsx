'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import type { User, UserRole } from '@/lib/types';

// This is a mock implementation and does not connect to any backend service.

type SignUpCredentials = {
  name: User['name'];
  email: User['email'];
  password?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => void;
  signUp: (credentials: SignUpCredentials) => Promise<{ success: boolean; message: string; requiresConfirmation?: boolean }>;
  updateUserIdentity: (updates: { name?: string; phone?: string; password?: string }) => Promise<{ success: boolean; message: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for demonstration purposes.
// The user is logged in as 'مدير النظام' to have full access.
const mockUser: User = {
    id: '1',
    name: 'مدير النظام (تجريبي)',
    email: 'admin@example.com',
    role: 'مدير النظام',
    status: 'نشط',
    phone: '0501234567',
    photoURL: "https://placehold.co/40x40.png",
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(mockUser);
  
  // No loading state needed for mock implementation
  const loading = false; 
  const role = user?.role ?? null;

  const signIn = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    console.log("Mock sign in for:", email);
    // In a real app, this would be a no-op. Here we set the user for demo.
    setUser(mockUser);
    return { success: true, message: 'تم تسجيل الدخول بنجاح (تجريبيًا).' };
  };

  const signOutUser = () => {
    console.log("Mock sign out");
    setUser(null);
  };
  
  const signUp = async (credentials: SignUpCredentials): Promise<{ success: boolean; message: string; requiresConfirmation?: boolean; }> => {
    console.log("Mock sign up for:", credentials.email);
    return { success: true, message: 'تم إنشاء الحساب بنجاح (تجريبيًا).', requiresConfirmation: false };
  };
  
  const updateUserIdentity = async (updates: { name?: string; phone?: string; password?: string }): Promise<{ success: boolean; message: string }> => {
    console.log("Mock update user:", updates);
    if(user){
        setUser(prev => prev ? {...prev, ...updates} : null);
    }
    return { success: true, message: "تم تحديث معلوماتك بنجاح (تجريبيًا)." };
  };

  const value = { user, loading, role, signIn, signOutUser, signUp, updateUserIdentity };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
