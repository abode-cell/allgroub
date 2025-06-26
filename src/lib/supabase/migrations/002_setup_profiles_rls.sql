-- Drop existing policies if they exist, to avoid "already exists" errors.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- 1. Enable RLS for the 'profiles' table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create policy: Public profiles are viewable by everyone.
-- This allows anyone to see profiles, which is needed for things like showing user names.
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles FOR SELECT
USING (true);

-- 3. Create policy: Users can insert their own profile.
-- This allows a new user to have a profile created for them when they sign up.
CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- 4. Create policy: Users can update their own profile.
-- This allows a logged-in user to change their name, phone number, etc.
CREATE POLICY "Users can update own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
