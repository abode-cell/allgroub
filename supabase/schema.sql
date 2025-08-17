
-- Drop existing triggers and functions if they exist to start clean
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user;

-- Create the function to handle new user creation
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role text;
  office_name_text text;
  trial_period_days int;
  trial_end_date timestamp with time zone;
begin
  -- Extract user_role and office_name from metadata, provide defaults if missing
  user_role := new.raw_user_meta_data ->> 'user_role';
  office_name_text := new.raw_user_meta_data ->> 'office_name';

  -- Set default role to 'مدير المكتب' if not provided
  if user_role is null or user_role = '' then
    user_role := 'مدير المكتب';
  end if;

  -- Set trial period only for 'مدير المكتب'
  if user_role = 'مدير المكتب' then
    -- Get default trial days from app_config, default to 14 if not found
    select (value ->> 'value')::int into trial_period_days from public.app_config where key = 'defaultTrialPeriodDays' limit 1;
    if not found then
      trial_period_days := 14;
    end if;
    trial_end_date := now() + (trial_period_days || ' days')::interval;
  else
    trial_end_date := null;
  end if;
  
  -- Insert into public.users table
  insert into public.users (id, email, name, office_name, phone, role, status, "managedBy", "submittedBy", "registrationDate", "trialEndsAt")
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    office_name_text,
    new.raw_user_meta_data ->> 'raw_phone_number',
    user_role,
    case when user_role = 'مدير المكتب' then 'معلق' else 'نشط' end, -- Office managers start as 'معلق'
    (new.raw_user_meta_data ->> 'managedBy')::uuid,
    (new.raw_user_meta_data ->> 'submittedBy')::uuid,
    new.created_at,
    trial_end_date
  );
  return new;
end;
$$;

-- Create the trigger on the auth.users table
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- #################################################################
-- # RLS (Row Level Security) Policies
-- #################################################################

-- Enable RLS for all relevant tables
alter table public.users enable row level security;
alter table public.investors enable row level security;
alter table public.borrowers enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.app_config enable row level security;
alter table public.branches enable row level security;


-- Drop existing policies to avoid conflicts
drop policy if exists "Enable read access for all authenticated users" on public.users;
drop policy if exists "Enable read access for related users" on public.users;
drop policy if exists "SysAdmins can manage all users" on public.users;
drop policy if exists "Users can update their own profile" on public.users;

drop policy if exists "Enable read access for related users" on public.investors;
drop policy if exists "Enable full access for managers" on public.investors;

drop policy if exists "Enable read access for related users" on public.borrowers;
drop policy if exists "Enable full access for managers" on public.borrowers;

drop policy if exists "Enable read access for related users" on public.transactions;
drop policy if exists "Enable insert for managers" on public.transactions;

drop policy if exists "Enable read access for recipients" on public.notifications;
drop policy if exists "Enable insert for all users" on public.notifications;
drop policy if exists "Enable delete for recipients" on public.notifications;
drop policy if exists "Enable update for recipients" on public.notifications;

drop policy if exists "Enable insert for all users" on public.support_tickets;
drop policy if exists "Enable read/delete for SysAdmins" on public.support_tickets;

drop policy if exists "Enable read access for all users" on public.app_config;
drop policy if exists "Enable update for SysAdmins" on public.app_config;

drop policy if exists "Enable read for related users" on public.branches;
drop policy if exists "Enable insert/delete for managers" on public.branches;


-- Create Policies for 'users' table
create policy "Enable read access for related users" on public.users for select using (
  auth.uid() = id or -- User can see their own data
  auth.uid() = "managedBy" or -- Manager can see their subordinates
  (select "managedBy" from public.users where id = auth.uid()) = "managedBy" -- Subordinates can see their colleagues and manager
);
create policy "SysAdmins can manage all users" on public.users for all using (
  (select role from public.users where id = auth.uid()) = 'مدير النظام'
);
create policy "Users can update their own profile" on public.users for update using (
  auth.uid() = id
);


-- Create Policies for 'investors' table
create policy "Enable read access for related users" on public.investors for select using (
  auth.uid() = id or -- Investor can see their own profile
  (select role from public.users where id = auth.uid()) = 'مدير النظام' or
  ( -- Manager and their team can see investors linked to the manager
    (select "managedBy" from public.users where id = (select "managedBy" from public.users where id = auth.uid())) = (select "managedBy" from public.users where id = public.investors.id)
    or
    auth.uid() = (select "managedBy" from public.users where id = public.investors.id)
  )
);
create policy "Enable full access for managers" on public.investors for all using (
  (select role from public.users where id = auth.uid()) in ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب')
);


-- Create Policies for 'borrowers' table
create policy "Enable read access for related users" on public.borrowers for select using (
  (select role from public.users where id = auth.uid()) = 'مدير النظام' or
  ( -- Manager and their team can see borrowers submitted by anyone on the team
    (select "managedBy" from public.users where id = auth.uid()) = (select "managedBy" from public.users where id = public.borrowers."submittedBy")
     or
    auth.uid() = (select "managedBy" from public.users where id = public.borrowers."submittedBy")
  )
);
create policy "Enable full access for managers" on public.borrowers for all using (
  (select role from public.users where id = auth.uid()) in ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف')
);


-- Create Policies for 'transactions' table
create policy "Enable read access for related users" on public.transactions for select using (
  auth.uid() = investor_id or -- Investor can see their own transactions
  (select role from public.users where id = auth.uid()) = 'مدير النظام' or
  ( -- Manager and their team can see transactions of investors they manage
    (select "managedBy" from public.users where id = auth.uid()) = (select "managedBy" from public.users where id = public.transactions.investor_id)
     or
    auth.uid() = (select "managedBy" from public.users where id = public.transactions.investor_id)
  )
);
create policy "Enable insert for managers" on public.transactions for insert with check (
  (select role from public.users where id = auth.uid()) in ('مدير النظام', 'مدير المكتب')
);


-- Create Policies for 'notifications' table
create policy "Enable read access for recipients" on public.notifications for select using (auth.uid() = "recipientId");
create policy "Enable insert for all users" on public.notifications for insert with check (true);
create policy "Enable delete for recipients" on public.notifications for delete using (auth.uid() = "recipientId");
create policy "Enable update for recipients" on public.notifications for update using (auth.uid() = "recipientId");


-- Create Policies for 'support_tickets' table
create policy "Enable insert for all users" on public.support_tickets for insert with check (auth.uid() = "fromUserId");
create policy "Enable read/delete for SysAdmins" on public.support_tickets for all using (
  (select role from public.users where id = auth.uid()) = 'مدير النظام'
);


-- Create Policies for 'app_config' table
create policy "Enable read access for all users" on public.app_config for select using (true);
create policy "Enable update for SysAdmins" on public.app_config for update using (
  (select role from public.users where id = auth.uid()) = 'مدير النظام'
);

-- Create Policies for 'branches' table
create policy "Enable read for related users" on public.branches for select using (
    auth.uid() = manager_id or
    (select "managedBy" from public.users where id = auth.uid()) = manager_id
);
create policy "Enable insert/delete for managers" on public.branches for all using (
    auth.uid() = manager_id and (select role from public.users where id = auth.uid()) = 'مدير المكتب'
);


-- #################################################################
-- # Initial Data Seeding
-- #################################################################

-- Clear existing config data to avoid duplicates
delete from public.app_config;

-- Insert default app configuration
insert into public.app_config (key, value) values
('baseInterestRate', '{"value": 15}'::jsonb),
('investorSharePercentage', '{"value": 70}'::jsonb),
('salaryRepaymentPercentage', '{"value": 65}'::jsonb),
('graceTotalProfitPercentage', '{"value": 50}'::jsonb),
('graceInvestorSharePercentage', '{"value": 33.3}'::jsonb),
('supportEmail', '{"value": "qzmpty678@gmail.com"}'::jsonb),
('supportPhone', '{"value": "0598360380"}'::jsonb),
('defaultTrialPeriodDays', '{"value": 14}'::jsonb);

