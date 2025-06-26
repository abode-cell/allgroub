'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, UserRole } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

type SignUpCredentials = {
  name: User['name'];
  email: User['email'];
  password?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  role: UserRole;
  setRole: (role: UserRole) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signOutUser: () => void;
  signUp: (credentials: SignUpCredentials) => Promise<{ success: boolean; message: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const supabase = createClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('مدير النظام');

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if(!session) {
        setLoading(false);
      }
    }
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (supabaseUser) {
      const fetchProfile = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setUser(null);
        } else if (data) {
          const fullUser: User = {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            name: data.name,
            photoURL: data.photoURL,
            role: data.role,
            status: data.status,
          };
          setUser(fullUser);
          setRole(fullUser.role);
        }
        setLoading(false);
      };
      fetchProfile();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [supabaseUser]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
    }
    if (!authData.user) {
        return { success: false, message: 'فشل تسجيل الدخول، لم يتم العثور على المستخدم.' };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', authData.user.id)
        .single();

    if (profileError || !profile) {
        await supabase.auth.signOut();
        return { success: false, message: 'لم يتم العثور على ملف تعريف المستخدم.' };
    }
    
    if (profile.status === 'معلق') {
      await supabase.auth.signOut();
      return { success: false, message: 'الحساب معلق. يرجى التواصل مع مدير النظام.' };
    }

    return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
  };

  const signOutUser = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('مدير النظام'); // Reset to default
  };

  const signUp = async (credentials: SignUpCredentials): Promise<{ success: boolean; message: string }> => {
    if (!credentials.password) {
        return { success: false, message: 'كلمة المرور مطلوبة.' };
    }
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name,
          photoURL: 'https://placehold.co/40x40.png',
        },
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        name: credentials.name,
        email: credentials.email,
        photoURL: 'https://placehold.co/40x40.png',
        role: 'موظف', // Default role for new signups
        status: 'معلق', // New users are pending activation
      });

      if (profileError) {
        // In a real app, you might want to delete the auth user here if profile creation fails
        console.error("Failed to create user profile:", profileError);
        return { success: false, message: "فشل إنشاء ملف تعريف المستخدم." };
      }
    }

    return { success: true, message: 'تم التسجيل بنجاح. حسابك في انتظار التفعيل.' };
  };

  const value = { user, loading, role, setRole, signIn, signOutUser, signUp };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
