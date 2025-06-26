-- Enable Row Level Security on the 'profiles' table.
-- This is a security best practice in Supabase.
alter table public.profiles enable row level security;

-- Drop existing policies to ensure a clean setup.
drop policy if exists "Users can view their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;
drop policy if exists "Admins can manage all profiles." on public.profiles;


-- Create a policy to allow authenticated users to view their OWN profile.
-- This is essential for the login process to fetch user details.
create policy "Users can view their own profile."
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Create a policy to allow authenticated users to update their OWN profile.
-- This is needed for the "Profile" page to function correctly.
create policy "Users can update their own profile."
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Create a policy to allow admin users ('مدير النظام') to view and manage all profiles.
-- This is necessary for the 'Users' page in the admin settings.
-- It uses a helper function to check the user's role.
create policy "Admins can manage all profiles."
  on public.profiles for all
  to authenticated
  using (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'مدير النظام'
  )
  with check (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'مدير النظام'
  );
