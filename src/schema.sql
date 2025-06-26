-- Create the 'profiles' table to store user data
-- This table is linked to the auth.users table via the 'id' column.
create table
  public.profiles (
    id uuid not null references auth.users on delete cascade,
    name text null,
    email text null,
    photoURL text null,
    role text null default 'موظف'::text,
    status text null default 'معلق'::text,
    constraint profiles_pkey primary key (id),
    constraint profiles_id_key unique (id)
  ) tablespace pg_default;

-- Create the 'borrowers' table to store loan information
create table
  public.borrowers (
    id uuid not null default gen_random_uuid (),
    name text not null,
    amount double precision not null,
    rate double precision not null,
    term integer not null,
    date date not null default now(),
    "loanType" text not null default 'اقساط'::text,
    status text not null default 'معلق'::text,
    "dueDate" date not null,
    "submittedBy" uuid null,
    "rejectionReason" text null,
    constraint borrowers_pkey primary key (id)
  ) tablespace pg_default;

-- Create the 'investors' table to store investor data
create table
  public.investors (
    id uuid not null default gen_random_uuid (),
    name text not null,
    amount double precision not null,
    date date not null default now(),
    status text not null default 'نشط'::text,
    "withdrawalHistory" jsonb not null default '[]'::jsonb,
    "fundedLoanIds" jsonb not null default '[]'::jsonb,
    "defaultedFunds" double precision not null default 0,
    "submittedBy" uuid null,
    "rejectionReason" text null,
    constraint investors_pkey primary key (id)
  ) tablespace pg_default;

-- Set up Row Level Security (RLS) for the 'profiles' table
alter table public.profiles enable row level security;
create policy "Allow all authenticated to read" on public.profiles for select to authenticated using (true);
create policy "Allow user to update their own profile" on public.profiles for update to authenticated using ((select auth.uid ()) = id);
create policy "Allow system admin to do all" on public.profiles for all to authenticated using ((select role from public.profiles where id = auth.uid()) = 'مدير النظام'::text);


-- Set up Row Level Security (RLS) for the 'borrowers' table
alter table public.borrowers enable row level security;
create policy "Allow all authenticated to read" on public.borrowers for select to authenticated using (true);
create policy "Allow manager or employee to insert" on public.borrowers for insert to authenticated with check (((select role from public.profiles where id = auth.uid()) = 'مدير النظام'::text or (select role from public.profiles where id = auth.uid()) = 'مدير المكتب'::text or (select role from public.profiles where id = auth.uid()) = 'موظف'::text));
create policy "Allow manager to update" on public.borrowers for update to authenticated using (((select role from public.profiles where id = auth.uid()) = 'مدير النظام'::text or (select role from public.profiles where id = auth.uid()) = 'مدير المكتب'::text));

-- Set up Row Level Security (RLS) for the 'investors' table
alter table public.investors enable row level security;
create policy "Allow all authenticated to read" on public.investors for select to authenticated using (true);
create policy "Allow manager to insert" on public.investors for insert to authenticated with check (((select role from public.profiles where id = auth.uid()) = 'مدير النظام'::text or (select role from public.profiles where id = auth.uid()) = 'مدير المكتب'::text));
create policy "Allow manager to update" on public.investors for update to authenticated using (((select role from public.profiles where id = auth.uid()) = 'مدير النظام'::text or (select role from public.profiles where id = auth.uid()) = 'مدير المكتب'::text));
