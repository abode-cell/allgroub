-- Final RLS Policies & Helper Function (v6)
-- This script creates the missing helper function AND all required security policies with correct syntax.

-- Part 1: Create the helper function to get a user's role safely.
-- Drop the function if it already exists to avoid errors on re-run.
DROP FUNCTION IF EXISTS public.get_user_role(user_id uuid);

-- Create the function.
-- It takes a user's ID and returns their role from the profiles table.
-- SECURITY DEFINER is important for it to work correctly within RLS policies.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;


-- Part 2: Drop all existing policies to ensure a clean slate.
-- This prevents errors if the script is run multiple times.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.borrowers;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.borrowers;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.investors;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.investors;


-- Part 3: Create the final, correct policies for all tables.

---------------------------------
-- PROFILES TABLE POLICIES
---------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY; -- Ensures rules apply to table owners

-- Policy 1: Authenticated users can VIEW all profiles. (KEY FIX FOR LOGIN)
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 2: Users can create their own profile record.
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile.
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy 4: Admins can UPDATE any profile.
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'مدير النظام');

-- Policy 5: Admins can DELETE any profile except their own.
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'مدير النظام' AND auth.uid() <> id);


---------------------------------
-- BORROWERS TABLE POLICIES
---------------------------------
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers FORCE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read access"
  ON public.borrowers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow managers and employees to modify"
  ON public.borrowers FOR ALL USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));


---------------------------------
-- INVESTORS TABLE POLICIES
---------------------------------
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors FORCE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read access"
  ON public.investors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow managers and employees to modify"
  ON public.investors FOR ALL USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));
