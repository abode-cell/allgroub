'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, UserRole } from '@/lib/types';
import { usersData } from '@/lib/data';

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
  signIn: (userId: string) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => void;
  signUp: (credentials: SignUpCredentials) => Promise<{ success: boolean; message: string; requiresConfirmation?: boolean }>;
  updateUserIdentity: (updates: { name?: string; phone?: string; password?: string }) => Promise<{ success: boolean; message: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    try {
      const loggedInUserId = localStorage.getItem('loggedInUserId');
      if (loggedInUserId) {
        const loggedInUser = usersData.find(u => u.id === loggedInUserId);
        if (loggedInUser) {
          setUser(loggedInUser);
        }
      }
    } catch (error) {
        console.error("Could not access localStorage:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  const role = user?.role ?? null;

  const signIn = async (userId: string): Promise<{ success: boolean; message: string }> => {
    const userToSignIn = usersData.find(u => u.id === userId);
    if (userToSignIn) {
      setUser(userToSignIn);
      try {
        localStorage.setItem('loggedInUserId', userToSignIn.id);
      } catch (error) {
        console.error("Could not access localStorage:", error);
      }
      return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
    }
    return { success: false, message: 'المستخدم غير موجود.' };
  };

  const signOutUser = () => {
    setUser(null);
    try {
      localStorage.removeItem('loggedInUserId');
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
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
