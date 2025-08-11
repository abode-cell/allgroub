
'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from '@/lib/types';
import { isPast } from 'date-fns';
import { APP_DATA_KEY, useDataState } from './data-context';
import { useRouter } from 'next/navigation';

// This is a mock implementation and does not connect to any backend service.

type SignInCredentials = {
  identifier: string; // Can be email or phone
  password?: string;
};

type AuthContextType = {
  userId: string | null;
  loading: boolean;
  signIn: (credentials: SignInCredentials) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { users, supportEmail, supportPhone } = useDataState();
  
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

  const signIn = async (credentials: SignInCredentials) => {
    const { identifier, password } = credentials;
    const userToSignIn = users.find(u => u.email === identifier || u.phone === identifier);

    if (!userToSignIn) {
      return { success: false, message: 'الحساب غير موجود أو تم حذفه.' };
    }

    // Critical Security Check: If the user is a subordinate, check their manager's status first.
    if (userToSignIn.managedBy) {
        const manager = users.find(u => u.id === userToSignIn.managedBy);
        if (!manager || manager.status !== 'نشط') {
            return { success: false, message: 'تم تعليق حساب المدير المسؤول عنك. لا يمكنك تسجيل الدخول حالياً.' };
        }
    }
    
    // Check status first, as it's the most definitive state.
    if (userToSignIn.status === 'محذوف') {
      return { success: false, message: 'هذا الحساب تم حذفه ولا يمكن الوصول إليه.' };
    }
    if (userToSignIn.status === 'معلق') {
      if (userToSignIn.role === 'مدير المكتب') {
        const contactInfo = [supportEmail, supportPhone].filter(Boolean).join(' أو ');
        const message = `حسابك قيد المراجعة. لمتابعة حالة الطلب، يرجى التواصل مع الدعم الفني${contactInfo ? ` على: ${contactInfo}` : '.'}`;
        return { success: false, message };
      }
      return { success: false, message: 'حسابك معلق وفي انتظار موافقة المدير.' };
    }
    
    if (userToSignIn.status === 'مرفوض') {
       return { success: false, message: 'تم رفض طلب انضمام هذا الحساب. يرجى التواصل مع مديرك.' };
    }

    // Now, check for expired trial for office managers whose status is not 'نشط' (which implies it's suspended due to trial end)
    if (userToSignIn.role === 'مدير المكتب' && userToSignIn.status !== 'نشط' && userToSignIn.trialEndsAt) {
        const trialEndDate = new Date(userToSignIn.trialEndsAt);
        if (isPast(trialEndDate)) {
             const contactInfo = [supportEmail, supportPhone].filter(Boolean).join(' أو ');
             const message = `انتهت الفترة التجريبية المجانية لحسابك. لتفعيل حسابك، يرجى التواصل مع الدعم الفني${contactInfo ? ` على: ${contactInfo}` : '.'}`;
             return { success: false, message };
        }
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
      // Clearing the app data is crucial to prevent inconsistencies on next login.
      localStorage.removeItem(APP_DATA_KEY);
      router.push('/login'); // Use router for smoother navigation
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
