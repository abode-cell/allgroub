'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from '@/lib/types';

// This is a mock implementation and does not connect to any backend service.

type SignInCredentials = {
  identifier: string; // Can be email or phone
  password?: string;
};

type AuthContextType = {
  userId: string | null;
  loading: boolean;
  signIn: (credentials: SignInCredentials, allUsers: User[]) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    try {
      // Force sign out by clearing the stored user ID.
      localStorage.removeItem('loggedInUserId');
      setUserId(null);
    } catch (error) {
        console.error("Could not access localStorage:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  const signIn = async (credentials: SignInCredentials, allUsers: User[]) => {
    const { identifier, password } = credentials;
    const userToSignIn = allUsers.find(u => (u.email === identifier || u.phone === identifier));

    if (!userToSignIn) {
        return { success: false, message: 'الحساب غير موجود أو تم حذفه.' };
    }

    if (userToSignIn.status === 'معلق') {
        return { success: false, message: 'حسابك معلق وفي انتظار موافقة المدير.' };
    }
    
    if (userToSignIn.password !== password) {
        return { success: false, message: 'كلمة المرور غير صحيحة.' };
    }

    setUserId(userToSignIn.id);
    try {
        localStorage.setItem('loggedInUserId', userToSignIn.id);
    } catch (error) {
        console.error("Could not access localStorage:", error);
    }
    return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
};

  const signOutUser = () => {
    setUserId(null);
    try {
      localStorage.removeItem('loggedInUserId');
      window.location.href = '/login'; // Force reload to clear state
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
  };

  const value = { userId, loading, signIn, signOutUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
