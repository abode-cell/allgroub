'use client';
// This page is no longer used as Supabase has been disconnected.
// Authentication is now mocked in AuthProvider for demonstration purposes.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
