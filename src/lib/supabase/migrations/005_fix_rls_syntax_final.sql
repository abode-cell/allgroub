-- Final RLS Policies (v5) - Fixing SQL syntax error.
-- This script corrects the 'FOR UPDATE, DELETE' syntax and provides the definitive RLS setup.

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
-- This includes old and potentially incorrect policy names.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update and delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.borrowers;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.borrowers;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.investors;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.investors;


-- Part 3: Create the final, correct policies.

---------------------------------
-- PROFILES TABLE POLICIES
---------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Any authenticated user can VIEW profiles. THIS IS THE KEY FIX for login.
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

-- Policy 4 (CORRECTED SYNTAX): Admins can UPDATE profiles.
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'مدير النظام');
  
-- Policy 5 (CORRECTED SYNTAX): Admins can DELETE profiles.
-- Admins cannot delete their own profile.
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'مدير النظام' AND auth.uid() <> id);


---------------------------------
-- BORROWERS & INVESTORS POLICIES (Unchanged)
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
