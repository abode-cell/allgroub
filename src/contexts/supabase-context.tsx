'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseContextType = {
  supabase: SupabaseClient;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

// Helper to check for a valid URL format
function isValidURL(url: string | undefined): url is string {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

function MissingEnvVars() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const urlIsValid = isValidURL(supabaseUrl);
  const keyIsValid = supabaseAnonKey && supabaseAnonKey.length > 10; // Basic check for key presence

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-8">
      <div className="w-full max-w-lg rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <h1 className="text-xl font-bold text-destructive">
          خطأ في تهيئة Supabase
        </h1>
        <p className="mt-2 text-destructive/90">
          فشل الاتصال بـ Supabase. الرجاء مراجعة الإعدادات في ملف <code>.env</code>.
        </p>
        
        <div className="mt-4 text-left text-sm text-foreground bg-background/50 p-4 rounded-md border border-dashed border-destructive/30">
            <div className='flex items-center gap-3'>
                <span className={`text-lg ${urlIsValid ? 'text-green-500' : 'text-destructive'}`}>{urlIsValid ? '✅' : '❌'}</span>
                <div>
                    <h3 className="font-bold">رابط Supabase (URL)</h3>
                    <p className="text-xs text-muted-foreground">
                        {urlIsValid 
                            ? "تم العثور على رابط صالح." 
                            : "الرابط غير موجود أو غير صالح. يرجى نسخه من إعدادات مشروعك في Supabase ولصقه في ملف .env."}
                    </p>
                </div>
            </div>
            <hr className="my-3 border-destructive/20" />
             <div className='flex items-center gap-3'>
                <span className={`text-lg ${keyIsValid ? 'text-green-500' : 'text-destructive'}`}>{keyIsValid ? '✅' : '❌'}</span>
                <div>
                    <h3 className="font-bold">مفتاح Supabase (Anon Key)</h3>
                    <p className="text-xs text-muted-foreground">
                        {keyIsValid 
                            ? "تم العثور على المفتاح." 
                            : "المفتاح غير موجود. يرجى نسخه من إعدادات مشروعك في Supabase ولصقه في ملف .env."}
                    </p>
                </div>
            </div>
        </div>

         <p className="mt-4 text-xs text-muted-foreground">
          تأكد من عدم وجود مسافات أو أحرف إضافية، ومن أنك قمت بحفظ الملف بعد التعديل.
        </p>
      </div>
    </div>
  );
}


export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const varsAreInvalid = !isValidURL(supabaseUrl) || !supabaseAnonKey || supabaseAnonKey.length < 10;

  if (varsAreInvalid) {
    // Only render the error component on the client after hydration to avoid mismatch
    return isClient ? <MissingEnvVars /> : null;
  }

  const [supabase] = useState(() => createClient());

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);

  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }

  return context;
}
