-- Function to create a profile for a new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, "photoURL", role, status, phone)
  values (
    new.id, 
    new.raw_user_meta_data ->> 'name',
    new.email,
    new.raw_user_meta_data ->> 'photoURL',
    'موظف', -- Default role for new users
    'معلق',  -- Default status for new users
    null -- Initialize phone as null
  );
  return new;
end;
$$;

-- Trigger to run the function when a new user is created in auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
