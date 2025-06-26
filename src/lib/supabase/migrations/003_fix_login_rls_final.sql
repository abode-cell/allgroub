-- Final RLS Policies (v4) - Fixing circular dependency for good.
-- This script splits the admin policy to avoid recursion on SELECT.

-- Part 1: Helper function (ensure it exists)
-- This function gets a user's role safely to be used in policies.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;


-- Part 2: Drop all existing policies for a clean slate.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update and delete profiles" ON public.profiles;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.borrowers;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.borrowers;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.investors;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.investors;


-- Part 3: Create the final, correct policies.

---------------------------------
-- PROFILES TABLE POLICIES
---------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Any authenticated user can VIEW profiles. THIS IS THE KEY FIX.
-- This policy is simple and has no subqueries, allowing the initial profile fetch to succeed.
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

-- Policy 4 (CRITICAL CHANGE): Admins can UPDATE and DELETE profiles.
-- By specifying FOR UPDATE, DELETE, this policy won't be triggered during SELECT, breaking the loop.
CREATE POLICY "Admins can update and delete profiles"
  ON public.profiles FOR UPDATE, DELETE
  USING (public.get_user_role(auth.uid()) = 'مدير النظام');


---------------------------------
-- BORROWERS & INVESTORS POLICIES
---------------------------------
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read access"
  ON public.borrowers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow managers and employees to modify"
  ON public.borrowers FOR ALL USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));

ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read access"
  ON public.investors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow managers and employees to modify"
  ON public.investors FOR ALL USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));
