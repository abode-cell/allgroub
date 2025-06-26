-- This script provides a comprehensive set of Row Level Security (RLS) policies
-- for the entire application. It ensures that users can only access the data
-- they are permitted to see, based on their role.

-- Drop all existing policies to ensure a clean slate.
-- This prevents "policy already exists" errors when re-running the script.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Allow admin full access" ON public.profiles;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.borrowers;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.borrowers;

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.investors;
DROP POLICY IF EXISTS "Allow managers and employees to modify" ON public.investors;


---------------------------------
-- PROFILES TABLE POLICIES
---------------------------------
-- 1. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Anyone can see profiles. This is needed to display user names.
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING (true);

-- 3. Policy: Users can create their own profile upon sign-up.
CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Policy: Users can update their own profile information.
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 5. Policy: System Admins can manage all user profiles.
CREATE POLICY "Allow admin full access"
    ON public.profiles FOR ALL
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'مدير النظام')
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'مدير النظام');

---------------------------------
-- BORROWERS TABLE POLICIES (Fixes Login)
---------------------------------
-- 1. Enable RLS
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Allow any logged-in user to READ all borrowers.
-- This is the key change to fix the login issue. The app's UI will filter the data.
CREATE POLICY "Allow authenticated read access"
  ON public.borrowers FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Policy: Allow managers and employees to create, update, and delete borrowers.
CREATE POLICY "Allow managers and employees to modify"
  ON public.borrowers FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));


---------------------------------
-- INVESTORS TABLE POLICIES (Fixes Login)
---------------------------------
-- 1. Enable RLS
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Allow any logged-in user to READ all investors.
-- This is the key change to fix the login issue. The app's UI will filter the data.
CREATE POLICY "Allow authenticated read access"
  ON public.investors FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Policy: Allow managers and employees to create, update, and delete investors.
CREATE POLICY "Allow managers and employees to modify"
  ON public.investors FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('مدير النظام', 'مدير المكتب', 'موظف'));
