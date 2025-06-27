'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, UserRole } from '@/lib/types';
import { usersData } from '@/lib/data';

// This is a mock implementation and does not connect to any backend service.

type SignInCredentials = {
  identifier: string; // Can be email or phone
  password?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  signIn: (credentials: SignInCredentials) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => void;
  updateUserIdentity: (updates: Partial<User>) => Promise<{ success: boolean; message: string }>;
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

  const signIn = async (credentials: SignInCredentials): Promise<{ success: boolean; message: string }> => {
    const { identifier, password } = credentials;
    const userToSignIn = usersData.find(u => (u.email === identifier || u.phone === identifier));

    if (!userToSignIn) {
        return { success: false, message: 'البريد الإلكتروني/رقم الجوال أو كلمة المرور غير صحيحة.' };
    }

    if (userToSignIn.status === 'معلق') {
        return { success: false, message: 'حسابك معلق وفي انتظار موافقة المدير.' };
    }
    
    // In a real app, you would hash and compare passwords. Here we do a simple string comparison.
    if (userToSignIn.password !== password) {
        return { success: false, message: 'البريد الإلكتروني/رقم الجوال أو كلمة المرور غير صحيحة.' };
    }

    setUser(userToSignIn);
    try {
        localStorage.setItem('loggedInUserId', userToSignIn.id);
    } catch (error) {
        console.error("Could not access localStorage:", error);
    }
    return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
};

  const signOutUser = () => {
    setUser(null);
    try {
      localStorage.removeItem('loggedInUserId');
      window.location.href = '/login'; // Force reload to clear state
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
  };
  
  const updateUserIdentity = async (updates: Partial<User>): Promise<{ success: boolean; message: string }> => {
    if(user){
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        // This is a mock update and won't persist in the main data array across sessions.
        // A full implementation would require calling an update function from DataContext.
    }
    return { success: true, message: "تم تحديث معلوماتك بنجاح (تجريبيًا)." };
  };

  const value = { user, loading, role, signIn, signOutUser, updateUserIdentity };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
