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
  role: UserRole | null;
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
  const [loading, setLoading] = useState(true);
  
  const role = user?.role ?? null;

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const supaUser = session?.user ?? null;
        
        if (!supaUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, email, photoURL, role, status, phone')
          .eq('id', supaUser.id);
        
        if (error) {
          console.error('--- Supabase Profile Fetch Error ---');
          console.error('Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
          console.error('Message:', error.message || 'No message');
          console.error('Details:', error.details || 'No details');
          console.error('Code:', error.code || 'No code');

          let description = 'لم نتمكن من جلب بيانات حسابك.';
          if (error.message && !error.message.includes('object')) { 
            description += ` السبب: ${error.message}`;
          } else {
            description += ' حدث خطأ غير معروف في الاتصال بقاعدة البيانات. الرجاء التأكد من تطبيق سياسات الأمان (RLS) بشكل صحيح.';
          }

          toast({
              variant: 'destructive',
              title: 'فشل تحميل الملف الشخصي',
              description: description,
              duration: 7000,
          });

          await supabase.auth.signOut();
          setUser(null);
        } else if (!profiles || profiles.length === 0) {
            console.error('--- Supabase Profile Not Found ---');
            console.error('User exists in auth.users but not in public.profiles. User ID:', supaUser.id);
            toast({
                variant: 'destructive',
                title: 'خطأ في الحساب',
                description: 'لم يتم العثور على ملفك الشخصي. قد يكون السبب هو عدم تفعيل trigger إنشاء المستخدمين في Supabase. يرجى مراجعة الإعدادات أو التواصل مع الدعم.',
                duration: 9000,
            });
            await supabase.auth.signOut();
            setUser(null);
        } else if (profiles && profiles.length === 1) {
          const profile = profiles[0];
          if (profile.status === 'معلق') {
              toast({
                  variant: 'destructive',
                  title: 'الحساب معلق',
                  description: 'حسابك في انتظار التفعيل من قبل مدير النظام. لا يمكنك تسجيل الدخول حاليًا.',
                  duration: 5000,
              });
              await supabase.auth.signOut();
              setUser(null);
          } else {
              const fullUser: User = {
                id: supaUser.id,
                email: supaUser.email!,
                name: profile.name,
                photoURL: profile.photoURL,
                role: profile.role,
                status: profile.status,
                phone: profile.phone,
              };
              setUser(fullUser);
          }
        } else {
            let description = 'لم يتم العثور على ملفك الشخصي. الرجاء التواصل مع مدير النظام.';
            if (profiles && profiles.length > 1) {
                description = 'تم العثور على ملفات شخصية مكررة. الرجاء التواصل مع مدير النظام.';
            }
            toast({
                variant: 'destructive',
                title: 'خطأ في الحساب',
                description: description,
                duration: 7000,
            });
            await supabase.auth.signOut();
            setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, toast]);


  const signIn = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      let message = 'حدث خطأ أثناء تسجيل الدخول.';
      if (error.message.includes('Invalid login credentials')) {
        message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else {
        message = error.message;
      }
      return { success: false, message: message };
    }
    
    return { success: true, message: 'تم تسجيل الدخول بنجاح.' };
  };

  const signOutUser = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
        },
      },
    });

    if (error) {
      console.error('--- Supabase SignUp Error ---', JSON.stringify(error, null, 2));
      let translatedMessage = 'حدث خطأ غير متوقع أثناء التسجيل. يرجى المحاولة مرة أخرى.';
       if (error.message.includes('User already registered')) {
        translatedMessage = 'هذا البريد الإلكتروني مسجل بالفعل.';
      } else if (error.message.includes('Password should be at least')) {
        translatedMessage = 'كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.';
      } else if (error.message.includes('Database error saving new user')) {
        translatedMessage = 'حدث خطأ في قاعدة البيانات عند إنشاء الملف الشخصي. غالبًا ما يكون هذا بسبب خطأ في سياسة الأمان (RLS) على جدول "profiles". يرجى التأكد من أن سياسة الإدخال (INSERT) لا تمنع العملية التلقائية.';
      } else if (error.message.includes('Email signups are disabled')) {
        translatedMessage = 'تم تعطيل التسجيل عبر البريد الإلكتروني من قبل المسؤول.';
      } else {
        translatedMessage = error.message;
      }
      return { success: false, message: translatedMessage };
    }
    
    const requiresConfirmation = !!(data.user && !data.session);

    let message = 'تم تسجيل حسابك بنجاح. يجب على مدير النظام مراجعته وتفعيله قبل أن تتمكن من تسجيل الدخول.';
    if (requiresConfirmation) {
      message = 'خطوة أخيرة! لقد أرسلنا رابط تأكيد إلى بريدك الإلكتروني. بعد تأكيده، سيقوم مدير النظام بمراجعة حسابك وتفعيله.';
    }

    return { success: true, message, requiresConfirmation };
  };
  
  const updateUserIdentity = async (updates: { name?: string; phone?: string; password?: string }): Promise<{ success: boolean; message: string }> => {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    if (!supabaseUser) return { success: false, message: "المستخدم غير مسجل الدخول." };
    
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
    
    const profileUpdates: { name?: string; phone?: string } = {};
    if (updates.name) profileUpdates.name = updates.name;
    if (typeof updates.phone !== 'undefined') profileUpdates.phone = updates.phone;

    if (Object.keys(profileUpdates).length > 0) {
        const { data: updatedProfiles, error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', supabaseUser.id)
            .select();

        if (profileError) {
            console.error('Profile Update Error:', profileError);
            return { success: false, message: "فشل تحديث الملف الشخصي: " + profileError.message };
        }
        
        if (updatedProfiles && updatedProfiles.length === 1) {
            const data = updatedProfiles[0];
            setUser(prevUser => prevUser ? { ...prevUser, ...data } : null);
        } else {
            console.error('Profile not found after update or duplicate profiles exist.');
        }
    }

    return { success: true, message: "تم تحديث معلوماتك بنجاح." };
  };


  const value = { user, loading, role, signIn, signOutUser, signUp, updateUserIdentity };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
