-- This script sets up Row Level Security (RLS) for all tables.
-- Run this script in the Supabase SQL Editor to apply permissions.

-- Drop all existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete users." ON public.profiles;

DROP POLICY IF EXISTS "Allow read access based on role." ON public.borrowers;
DROP POLICY IF EXISTS "Allow managers and employees to insert." ON public.borrowers;
DROP POLICY IF EXISTS "Allow managers to update." ON public.borrowers;
DROP POLICY IF EXISTS "Allow system admins to delete." ON public.borrowers;

DROP POLICY IF EXISTS "Allow managers to read all investors." ON public.investors;
DROP POLICY IF EXISTS "Allow investors to read their own data." ON public.investors;
DROP POLICY IF EXISTS "Allow managers and employees to insert investors." ON public.investors;
DROP POLICY IF EXISTS "Allow managers to update investors." ON public.investors;
DROP POLICY IF EXISTS "Allow system admins to delete investors." ON public.investors;

----------------------------------------------------------------
-- PROFILES TABLE RLS
----------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Note: Deleting a user from the UI only deletes the profile row, not the auth user.
-- Proper user deletion requires using the Supabase Admin SDK or Dashboard.
CREATE POLICY "Admins can delete users."
ON public.profiles FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'مدير النظام'
  )
);

----------------------------------------------------------------
-- BORROWERS TABLE RLS
----------------------------------------------------------------
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access based on role."
ON public.borrowers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('مدير النظام', 'مدير المكتب', 'موظف')
  )
);

CREATE POLICY "Allow managers and employees to insert."
ON public.borrowers FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('مدير النظام', 'مدير المكتب', 'موظف')
  )
);

CREATE POLICY "Allow managers to update."
ON public.borrowers FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('مدير النظام', 'مدير المكتب')
  )
);

-- For now, we will prevent deletes from the app to avoid orphaned data.
-- Deletes should be handled carefully, perhaps via the Supabase dashboard.
-- CREATE POLICY "Allow system admins to delete."
-- ON public.borrowers FOR DELETE USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE id = auth.uid() AND role = 'مدير النظام'
--   )
-- );

----------------------------------------------------------------
-- INVESTORS TABLE RLS
----------------------------------------------------------------
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

-- Managers and admins can see all investors
CREATE POLICY "Allow managers to read all investors."
ON public.investors FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('مدير النظام', 'مدير المكتب')
  )
);

-- An investor can only see their own profile
CREATE POLICY "Allow investors to read their own data."
ON public.investors FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'مستثمر' AND public.investors.id = auth.uid()
  )
);

CREATE POLICY "Allow managers and employees to insert investors."
ON public.investors FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('مدير النظام', 'مدير المكتب', 'موظف')
  )
);

CREATE POLICY "Allow managers to update investors."
ON public.investors FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('مدير النظام', 'مدير المكتب')
  )
);

-- For now, we will prevent deletes from the app to avoid orphaned data.
-- Deletes should be handled carefully, perhaps via the Supabase dashboard.
-- CREATE POLICY "Allow system admins to delete investors."
-- ON public.investors FOR DELETE USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE id = auth.uid() AND role = 'مدير النظام'
--   )
-- );
