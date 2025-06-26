-- This function is required to safely check a user's role within RLS policies
-- without causing circular dependencies. It retrieves the role from the 'profiles' table.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Final & Simplified RLS Policies to fix login issues.
-- This version avoids complex subqueries that can cause silent failures.

-- Drop all existing policies to ensure a clean slate.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin full access" ON public.profiles; -- Old policy name

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.borrowers;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.borrowers;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.investors;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.investors;


---------------------------------
-- PROFILES TABLE POLICIES
---------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all profiles.
-- This is crucial for the app to function correctly after login.
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Users can create their own profile record upon sign-up.
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile information.
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can manage all profiles (update/delete).
-- This policy now checks the role from a helper function to avoid subquery issues.
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.get_user_role(auth.uid()) = 'مدير النظام')
  WITH CHECK (public.get_user_role(auth.uid()) = 'مدير النظام');


---------------------------------
-- BORROWERS TABLE POLICIES
---------------------------------
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;

-- Policy: Any logged-in user can read all borrowers. The UI handles filtering.
CREATE POLICY "Allow authenticated read access"
  ON public.borrowers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Specific roles can modify borrowers.
CREATE POLICY "Allow managers and employees to modify"
  ON public.borrowers FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));


---------------------------------
-- INVESTORS TABLE POLICIES
---------------------------------
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

-- Policy: Any logged-in user can read all investors. The UI handles filtering.
CREATE POLICY "Allow authenticated read access"
  ON public.investors FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Specific roles can modify investors.
CREATE POLICY "Allow managers and employees to modify"
  ON public.investors FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));
