-- 1. Enable RLS on the 'profiles' table
alter table public.profiles enable row level security;

-- 2. Create policy for users to view their own profile
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

-- 3. Create policy for users to insert their own profile
create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

-- 4. Create policy for users to update their own profile
create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- This trigger automatically creates a profile for new users.
-- The `auth_context.tsx` was already trying to read this profile, which failed before RLS was set up correctly.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, photoURL, role, status)
  values (new.id, new.raw_user_meta_data->>'name', new.email, new.raw_user_meta_data->>'photoURL', 'موظف', 'معلق');
  return new;
end;
$$ language plpgsql security definer;

-- drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
