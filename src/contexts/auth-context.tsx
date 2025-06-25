'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider, firebaseInitialized } from '@/lib/firebase';

export type UserRole = 'مدير النظام' | 'مدير المكتب' | 'موظف' | 'مستثمر';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  role: UserRole;
  setRole: (role: UserRole) => void;
  signInWithGoogle: () => Promise<any>;
  signOutUser: () => Promise<void>;
  isFirebaseReady: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('مدير النظام');

  useEffect(() => {
    if (!firebaseInitialized || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      // Simple logic to map one user to investor role for demo
      if (user?.email?.startsWith('investor')) {
        setRole('مستثمر');
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = () => {
    if (!firebaseInitialized || !auth) {
      console.error("Firebase is not initialized. Cannot sign in.");
      return Promise.reject(new Error("Firebase not initialized"));
    }
    return signInWithPopup(auth, googleProvider);
  };

  const signOutUser = () => {
    if (!firebaseInitialized || !auth) {
      console.error("Firebase is not initialized. Cannot sign out.");
      return Promise.reject(new Error("Firebase not initialized"));
    }
    return signOut(auth);
  };

  const value = { user, loading, role, setRole, signInWithGoogle, signOutUser, isFirebaseReady: firebaseInitialized };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
