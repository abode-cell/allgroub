-- This function creates a new entry in the public.profiles table
-- when a new user signs up in the auth.users table.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, "photoURL", role, status)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    new.raw_user_meta_data->>'photoURL',
    'موظف', -- The default role for a new user
    'معلق'   -- The default status for a new user, requires admin activation
  );
  return new;
end;
$$;

-- This trigger calls the handle_new_user function every time
-- a new user is inserted into the auth.users table.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
