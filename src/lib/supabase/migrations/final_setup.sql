-- Final Supabase Setup Script (v16 - The Definitive RLS Fix)
-- This script corrects the SELECT policy on the profiles table, which was the final cause of the profile fetch error.
-- It establishes a standard, secure pattern: users can read their own profile, and admins can read all profiles.

-- Part 1: Create a ROBUST function to handle new user signups.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles, but do not include photoURL as it may not exist in the table.
  INSERT INTO public.profiles (id, name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'مستخدم جديد'),
    NEW.email,
    'موظف', -- Default role for new signups
    'معلق'  -- Default status, requires admin activation
  );
  RETURN NEW;
END;
$$;

-- Ensure the trigger is attached and fires AFTER a user is created in the auth system.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Part 2: Create a safe role-checking helper function.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;


-- Part 3: Clean Slate - Drop all old policies to prevent any conflicts.
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  FOR policy_rec IN (SELECT pol.polname, 'public.' || cls.relname AS table_name FROM pg_policy pol JOIN pg_class cls ON pol.polrelid = cls.oid WHERE cls.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_rec.polname || '" ON ' || policy_rec.table_name || ';';
  END LOOP;
END;
$$;


-- Part 4: Create Final, Correct RLS Policies

-- PROFILES Table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- CRITICAL FIX: This SELECT policy is specific and correct.
-- It allows a user to read their OWN profile, and allows admins to read ALL profiles.
CREATE POLICY "Users can view their own profile, and admins can view all." ON public.profiles
  FOR SELECT USING (auth.uid() = id OR get_user_role(auth.uid()) = 'مدير النظام');

-- The INSERT policy allows the signup trigger to work.
CREATE POLICY "Allow profile creation via trigger." ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile." ON public.profiles
  FOR UPDATE USING (get_user_role(auth.uid()) = 'مدير النظام');

CREATE POLICY "Admins can delete any profile but not themselves." ON public.profiles
  FOR DELETE USING (get_user_role(auth.uid()) = 'مدير النظام' AND auth.uid() <> id);


-- BORROWERS Table
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read borrowers." ON public.borrowers
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow specific roles to modify borrowers." ON public.borrowers
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));

-- INVESTORS Table
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read investors." ON public.investors
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow specific roles to modify investors." ON public.investors
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));
