-- Drop existing policies if they exist to ensure a clean run.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- Create policy "Public profiles are viewable by everyone."
-- This policy allows anyone to view public profiles, which is necessary for the app to function.
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles
FOR SELECT
USING (true);

-- Create policy "Users can update their own profile."
-- This policy allows users to update their own profile information securely.
CREATE POLICY "Users can update their own profile."
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);
