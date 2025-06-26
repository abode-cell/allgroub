-- Final, Complete RLS Policies & Helper Function Script.
-- This script creates the missing helper function AND all required security policies.

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
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin full access" ON public.profiles; -- Old policy name

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.borrowers;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.borrowers;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.investors;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.investors;


-- Part 3: Create the final, correct policies for all tables.

---------------------------------
-- PROFILES TABLE POLICIES
---------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Use the new helper function here.
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.get_user_role(auth.uid()) = 'مدير النظام')
  WITH CHECK (public.get_user_role(auth.uid()) = 'مدير النظام' AND auth.uid() <> id); -- Admins cannot delete their own profile

---------------------------------
-- BORROWERS TABLE POLICIES
---------------------------------
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access"
  ON public.borrowers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Use the new helper function here.
CREATE POLICY "Allow managers and employees to modify"
  ON public.borrowers FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));


---------------------------------
-- INVESTORS TABLE POLICIES
---------------------------------
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access"
  ON public.investors FOR SELECT
  USING (auth.role() = 'authenticated');

-- Use the new helper function here.
CREATE POLICY "Allow managers and employees to modify"
  ON public.investors FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));
