-- Final, Consolidated RLS Policies & Helper Function Script.
-- This script performs all necessary database setup in the correct order.
-- RUN THIS SCRIPT ONCE in the Supabase SQL Editor.

-- Part 1: Create the helper function to get a user's role safely.
-- SECURITY DEFINER is important for it to work correctly within RLS policies.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Important: Set the search_path to prevent security issues.
  set search_path = public;
  SELECT role FROM public.profiles WHERE id = user_id;
$$;


-- Part 2: Drop all old policies to ensure a clean slate.
-- This dynamic block removes all existing policies from the public schema to prevent conflicts.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;


-- Part 3: Create the final, correct policies for all tables.

---------------------------------
-- PROFILES TABLE POLICIES
---------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Any authenticated user can VIEW profiles.
-- This simple rule is the key fix for the login issue.
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 2: Users can create their own profile record upon signup.
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

CREATE POLICY "Allow authenticated read access"
  ON public.borrowers FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow managers and employees to modify"
  ON public.borrowers FOR ALL USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));

---------------------------------
-- INVESTORS TABLE POLICIES
---------------------------------
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access"
  ON public.investors FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow managers and employees to modify"
  ON public.investors FOR ALL USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));
