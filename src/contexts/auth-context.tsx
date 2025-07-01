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
  signIn: (
    credentials: SignInCredentials,
    allUsers: User[],
    supportInfo: { email: string; phone: string }
  ) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // This effect runs once on the client when the component mounts.
    try {
      const storedUserId = localStorage.getItem('loggedInUserId');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = async (
    credentials: SignInCredentials,
    allUsers: User[],
    supportInfo: { email: string; phone: string }
  ) => {
    const { identifier, password } = credentials;
    const userToSignIn = allUsers.find(u => u.email === identifier || u.phone === identifier);

    if (!userToSignIn) {
      return { success: false, message: 'الحساب غير موجود أو تم حذفه.' };
    }

    if (userToSignIn.status === 'معلق') {
      // Check for expired trial first for office managers
      if (userToSignIn.role === 'مدير المكتب' && userToSignIn.trialEndsAt) {
          const trialEndDate = new Date(userToSignIn.trialEndsAt);
          if (new Date() > trialEndDate) {
              return {
                  success: false,
                  message: `انتهت الفترة التجريبية المجانية لحسابك. لتفعيل حسابك، يرجى التواصل مع الدعم الفني على: ${supportInfo.email} أو ${supportInfo.phone}`
              };
          }
      }

      if (userToSignIn.role === 'مدير المكتب') {
        return {
          success: false,
          message: `حسابك معلق. لمراجعة حالة حسابك، يرجى التواصل مع الدعم الفني على: ${supportInfo.email} أو ${supportInfo.phone}`
        };
      }
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
