'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, UserRole } from '@/lib/types';
import { useData } from './data-context';

// The user object in the context will be our custom User type
type AuthContextType = {
  user: User | null;
  loading: boolean;
  role: UserRole;
  setRole: (role: UserRole) => void;
  signIn: (email: string) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { users } = useData(); // Get users from DataProvider
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Role simulation is still needed if one user can switch roles
  const [role, setRole] = useState<UserRole>('مدير النظام');

  useEffect(() => {
    // On initial load, we can try to get a user from session storage for persistence
    try {
        const storedUser = sessionStorage.getItem('authUser');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Verify user still exists in our user list
            if (users.find(u => u.id === parsedUser.id)) {
                setUser(parsedUser);
                setRole(parsedUser.role);
            }
        }
    } catch (error) {
        // Could be SSR or invalid JSON
        console.error("Could not restore session:", error);
        sessionStorage.removeItem('authUser');
    }
    setLoading(false);
  }, [users]); // Re-run if users list changes (e.g. on activation)
  
  const signIn = async (email: string): Promise<{ success: boolean, message: string }> => {
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      return { success: false, message: 'المستخدم غير موجود.' };
    }

    if (foundUser.status === 'معلق') {
      return { success: false, message: 'الحساب معلق. يرجى التواصل مع مدير النظام.' };
    }

    setUser(foundUser);
    setRole(foundUser.role);
    sessionStorage.setItem('authUser', JSON.stringify(foundUser)); // Persist session
    return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
  };

  const signOutUser = () => {
    setUser(null);
    setRole('مدير النظام'); // Reset to default role on sign out
    sessionStorage.removeItem('authUser');
  };

  const value = { user, loading, role, setRole, signIn, signOutUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
