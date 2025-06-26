-- Create Profiles Table if it doesn't exist
create table if not exists
  public.profiles (
    id uuid not null,
    updated_at timestamp with time zone null,
    name character varying null,
    email character varying null,
    "photoURL" text null,
    role text null,
    status text null,
    constraint profiles_pkey primary key (id),
    constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade
  );
      
-- Create Borrowers Table if it doesn't exist
create table if not exists
  public.borrowers (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    name text null,
    amount double precision null,
    rate double precision null,
    term double precision null,
    date text null,
    "loanType" text null,
    status text null,
    "dueDate" text null,
    "submittedBy" uuid null,
    "rejectionReason" text null,
    constraint borrowers_pkey primary key (id)
  );

-- Create Investors Table if it doesn't exist
create table if not exists
  public.investors (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    name text null,
    amount double precision null,
    date text null,
    status text null,
    "withdrawalHistory" jsonb null,
    "fundedLoanIds" jsonb null,
    "defaultedFunds" double precision null,
    "submittedBy" uuid null,
    "rejectionReason" text null,
    constraint investors_pkey primary key (id)
  );
      
-- Set up Row Level Security (RLS)
-- Profiles
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile." on public.profiles;
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);

-- Borrowers
alter table public.borrowers enable row level security;
drop policy if exists "Borrowers are viewable by authenticated users." on public.borrowers;
create policy "Borrowers are viewable by authenticated users." on public.borrowers for select using (auth.role() = 'authenticated');

drop policy if exists "Managers can do anything on borrowers." on public.borrowers;
create policy "Managers can do anything on borrowers." on public.borrowers for all using (auth.uid() in (select id from public.profiles where role in ('مدير النظام', 'مدير المكتب', 'موظف')));

-- Investors
alter table public.investors enable row level security;
drop policy if exists "Investors are viewable by authenticated users." on public.investors;
create policy "Investors are viewable by authenticated users." on public.investors for select using (auth.role() = 'authenticated');

drop policy if exists "Managers can do anything on investors." on public.investors;
create policy "Managers can do anything on investors." on public.investors for all using (auth.uid() in (select id from public.profiles where role in ('مدير النظام', 'مدير المكتب', 'موظف')));

-- Function to create a profile for a new user
create or replace function public.handle_new_user()
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
    'موظف', -- Default role
    'معلق'   -- Default status
  );
  return new;
end;
$$;

-- Trigger to call the function on new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
