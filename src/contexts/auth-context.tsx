'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User, UserRole } from '@/lib/types';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useSupabase } from './supabase-context';
import { useToast } from '@/hooks/use-toast';

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
  updateUserIdentity: (updates: { name?: string; phone?: string; password?: string }) => Promise<{ success: boolean; message: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { supabase } = useSupabase();
  const { toast } = useToast();
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
            phone: data.phone,
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
      let message = 'حدث خطأ أثناء تسجيل الدخول.';
      if (authError.message.includes('Invalid login credentials')) {
        message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      }
      return { success: false, message };
    }

    if (!authData.user) {
        const message = 'فشل تسجيل الدخول، لم يتم العثور على المستخدم.';
        return { success: false, message };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', authData.user.id)
        .single();

    if (profileError || !profile) {
        await supabase.auth.signOut();
        const message = 'لم يتم العثور على ملف تعريف المستخدم.';
        return { success: false, message };
    }
    
    if (profile.status === 'معلق') {
      await supabase.auth.signOut();
      const message = 'الحساب معلق. يرجى التواصل مع مدير النظام.';
      return { success: false, message };
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
      let translatedMessage = 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.';
      if (error.message.includes('User already registered')) {
        translatedMessage = 'هذا البريد الإلكتروني مسجل بالفعل.';
      } else if (error.message.includes('Password should be at least')) {
        translatedMessage = 'كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.';
      } else if (error.message.includes('invalid format')) {
        translatedMessage = 'صيغة البريد الإلكتروني غير صالحة.';
      } else if (error.message.includes('Email signups are disabled')) {
        translatedMessage = 'تم تعطيل التسجيل عبر البريد الإلكتروني من قبل المسؤول.';
      }
      return { success: false, message: translatedMessage };
    }
    
    const requiresConfirmation = !!(data.user && !data.session);

    let message = 'تم تسجيل حسابك بنجاح! سيتم توجيهك لصفحة تسجيل الدخول.';
    if (requiresConfirmation) {
      message = 'خطوة أخيرة! لقد أرسلنا رابط تأكيد إلى بريدك الإلكتروني. الرجاء الضغط عليه لتفعيل حسابك.';
    }

    return { success: true, message, requiresConfirmation };
  };
  
  const updateUserIdentity = async (updates: { name?: string; phone?: string; password?: string }): Promise<{ success: boolean; message: string }> => {
    if (!supabaseUser) return { success: false, message: "المستخدم غير مسجل الدخول." };
    
    // Update password if provided
    if (updates.password) {
        if (updates.password.length < 6) {
            return { success: false, message: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل." };
        }
        const { error: passwordError } = await supabase.auth.updateUser({ password: updates.password });
        if (passwordError) {
            console.error('Password Update Error:', passwordError);
            return { success: false, message: "فشل تحديث كلمة المرور: " + passwordError.message };
        }
    }
    
    // Update profile if name or phone provided
    const profileUpdates: { name?: string; phone?: string } = {};
    if (updates.name) profileUpdates.name = updates.name;
    // Allow empty string for phone number to clear it
    if (typeof updates.phone !== 'undefined') profileUpdates.phone = updates.phone;

    if (Object.keys(profileUpdates).length > 0) {
        const { data, error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', supabaseUser.id)
            .select()
            .single();

        if (profileError) {
            console.error('Profile Update Error:', profileError);
            return { success: false, message: "فشل تحديث الملف الشخصي: " + profileError.message };
        }
        if (data) {
            // Update local user state
            setUser(prevUser => prevUser ? { ...prevUser, ...data } : null);
        }
    }

    return { success: true, message: "تم تحديث معلوماتك بنجاح." };
  };


  const value = { user, loading, role, setRole, signIn, signOutUser, signUp, updateUserIdentity };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
