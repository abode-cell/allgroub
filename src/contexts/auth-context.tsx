'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, IdTokenResult } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, firebaseInitialized } from '@/lib/firebase';

export type UserRole = 'مدير النظام' | 'مدير المكتب' | 'موظف' | 'مستثمر';

// A mock user for development when Firebase is not configured
const mockUser: User = {
  uid: 'mock-user-id',
  email: 'user@example.com',
  displayName: 'مستخدم تجريبي',
  photoURL: 'https://placehold.co/40x40.png',
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [],
  providerId: 'mock',
  tenantId: null,
  delete: async () => { console.warn('Mock delete called'); },
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async (): Promise<IdTokenResult> => ({
    token: 'mock-token',
    claims: {},
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    signInProvider: 'mock',
    signInSecondFactor: null,
    expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(),
  }),
  reload: async () => { console.warn('Mock reload called'); },
  toJSON: () => ({
    uid: 'mock-user-id',
    email: 'user@example.com',
    displayName: 'مستخدم تجريبي',
    photoURL: 'https://placehold.co/40x40.png',
  }),
};


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
    if (firebaseInitialized && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
        // Simple logic to map one user to investor role for demo
        if (user?.email?.startsWith('investor')) {
          setRole('مستثمر');
        }
      });
      return () => unsubscribe();
    } else {
      // If Firebase is not configured, use a mock user for development.
      console.warn("Firebase not configured. Using mock user for development.");
      setUser(mockUser);
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = () => {
    if (!firebaseInitialized || !auth) {
      console.warn("Firebase not configured. Simulating sign-in.");
      setUser(mockUser);
      setLoading(false);
      return Promise.resolve();
    }
    return signInWithPopup(auth, googleProvider);
  };

  const signOutUser = () => {
    if (!firebaseInitialized || !auth) {
      console.warn("Firebase not configured. Simulating sign-out.");
      setUser(null);
      return Promise.resolve();
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
