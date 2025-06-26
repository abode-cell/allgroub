'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseContextType = {
  supabase: SupabaseClient;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

function MissingEnvVars() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-8">
      <div className="w-full max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <h1 className="text-xl font-bold text-destructive">
          خطأ في تهيئة Supabase
        </h1>
        <p className="mt-2 text-destructive/90">
          فشل الاتصال بـ Supabase.
        </p>
        <p className="mt-4 text-sm text-destructive/80">
          الرجاء التأكد من صحة{' '}
          <code>NEXT_PUBLIC_SUPABASE_URL</code> (يجب أن يكون رابط URL صالح) و{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> في ملف{' '}
          <code>.env</code> الخاص بك.
        </p>
      </div>
    </div>
  );
}

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

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isValidURL(supabaseUrl) || !supabaseAnonKey) {
    return <MissingEnvVars />;
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
