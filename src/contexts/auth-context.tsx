'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, UserRole } from '@/lib/types';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useSupabase } from './supabase-context';

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
  signUp: (credentials: SignUpCredentials) => Promise<{ success: boolean; message: string; requiresConfirmation?: boolean }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { supabase } = useSupabase();
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
  }, [supabase]);

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
  }, [supabaseUser, supabase]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
      }
      console.error('Supabase SignIn Error:', authError);
      return { success: false, message: 'حدث خطأ أثناء تسجيل الدخول: ' + authError.message };
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

  const signUp = async (credentials: SignUpCredentials): Promise<{ success: boolean; message: string; requiresConfirmation?: boolean; }> => {
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
      console.error("Supabase SignUp Error:", error);
      let translatedMessage = 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.';
      if (error.message.includes('User already registered')) {
        translatedMessage = 'هذا البريد الإلكتروني مسجل بالفعل.';
      } else if (error.message.includes('Password should be at least')) {
        translatedMessage = 'كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.';
      } else if (error.message.includes('invalid format')) {
        translatedMessage = 'صيغة البريد الإلكتروني غير صالحة.';
      } else if (error.message.includes('Email signups are disabled')) {
        translatedMessage = 'تم تعطيل التسجيل عبر البريد الإلكتروني من قبل المسؤول.';
      } else {
        translatedMessage = `حدث خطأ: ${error.message}`;
      }
      return { success: false, message: translatedMessage };
    }
    
    const requiresConfirmation = data.user && !data.session;

    let message = 'تم تسجيل حسابك بنجاح! سيتم توجيهك لصفحة تسجيل الدخول.';
    if (requiresConfirmation) {
      message = 'خطوة أخيرة! لقد أرسلنا رابط تأكيد إلى بريدك الإلكتروني. الرجاء الضغط عليه لتفعيل حسابك.';
    }

    return { success: true, message, requiresConfirmation };
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
