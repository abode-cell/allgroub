
-- Enable UUID generation
create extension if not exists "uuid-ossp" with schema "extensions";

-- #=================================================================================
-- # T Y P E S
-- #=================================================================================

-- Define custom types for user roles and statuses
do $$
begin
    if not exists (select 1 from pg_type where typname = 'user_role') then
        create type public.user_role as enum ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');
    end if;
    if not exists (select 1 from pg_type where typname = 'user_status') then
        create type public.user_status as enum ('نشط', 'معلق', 'مرفوض', 'محذوف');
    end if;
     if not exists (select 1 from pg_type where typname = 'borrower_loan_type') then
        create type public.borrower_loan_type as enum ('اقساط', 'مهلة');
    end if;
    if not exists (select 1 from pg_type where typname = 'borrower_status') then
        create type public.borrower_status as enum ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');
    end if;
     if not exists (select 1 from pg_type where typname = 'borrower_payment_status') then
        create type public.borrower_payment_status as enum ('منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد');
    end if;
    if not exists (select 1 from pg_type where typname = 'installment_status') then
      create type public.installment_status as enum ('لم يسدد بعد', 'تم السداد', 'متأخر');
    end if;
    if not exists (select 1 from pg_type where typname = 'investor_status') then
        create type public.investor_status as enum ('نشط', 'غير نشط', 'معلق', 'مرفوض', 'محذوف');
    end if;
    if not exists (select 1 from pg_type where typname = 'transaction_type') then
        create type public.transaction_type as enum ('إيداع رأس المال', 'سحب من رأس المال');
    end if;
     if not exists (select 1 from pg_type where typname = 'withdrawal_method') then
        create type public.withdrawal_method as enum ('نقدي', 'بنكي');
    end if;
     if not exists (select 1 from pg_type where typname = 'capital_source') then
        create type public.capital_source as enum ('installment', 'grace');
    end if;
end$$;


-- #=================================================================================
-- # T A B L E S
-- #=================================================================================

-- Create Users table
create table if not exists public.users (
    "id" uuid not null primary key,
    "name" text not null,
    "office_name" text null,
    "email" text not null unique,
    "phone" text null unique,
    "role" public.user_role not null,
    "status" public.user_status not null default 'معلق',
    "managedBy" uuid null references public.users(id) on delete set null,
    "registrationDate" timestamp with time zone not null default timezone('utc'::text, now()),
    "trialEndsAt" timestamp with time zone,
    "investorLimit" integer not null default 10,
    "employeeLimit" integer not null default 5,
    "assistantLimit" integer not null default 1,
    "branchLimit" integer not null default 1,
    "allowEmployeeSubmissions" boolean not null default false,
    "hideEmployeeInvestorFunds" boolean not null default false,
    "allowEmployeeLoanEdits" boolean not null default false,
    "defaultTrialPeriodDays" integer not null default 14,
    "permissions" jsonb not null default '{}'::jsonb,
    "lastStatusChange" timestamp with time zone
);

comment on column public.users.managedBy is 'The ID of the Office Manager who manages this user.';
comment on column public.users.trialEndsAt is 'For Office Managers, the date their trial period ends.';
comment on column public.users.investorLimit is 'For Office Managers, max number of investors they can add.';
comment on column public.users.employeeLimit is 'For Office Managers, max number of employees they can add.';

-- Create Branches table
create table if not exists public.branches (
  "id" uuid not null primary key default uuid_generate_v4(),
  "manager_id" uuid not null references public.users(id) on delete cascade,
  "name" text not null,
  "city" text not null,
  "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);

-- Create App Config table
create table if not exists public.app_config (
    "key" text not null primary key,
    "value" jsonb not null,
    "description" text
);

-- Create Borrowers table
create table if not exists public.borrowers (
    "id" text not null primary key,
    "name" text not null,
    "nationalId" text not null,
    "phone" text not null,
    "amount" real not null,
    "rate" real,
    "term" real, -- in years
    "date" timestamp with time zone not null default timezone('utc'::text, now()),
    "loanType" public.borrower_loan_type not null,
    "status" public.borrower_status not null,
    "dueDate" date not null,
    "discount" real,
    "submittedBy" uuid references public.users(id) on delete set null,
    "rejectionReason" text,
    "fundedBy" jsonb,
    "paymentStatus" public.borrower_payment_status,
    "installments" jsonb,
    "isNotified" boolean default false,
    "lastStatusChange" timestamp with time zone,
    "paidOffDate" timestamp with time zone,
    "partial_payment_paid_amount" real,
    "partial_payment_remaining_loan_id" text,
    "originalLoanId" text
);
comment on column public.borrowers.fundedBy is 'JSON array of {investor_id, amount}';

-- Create Investors table
create table if not exists public.investors (
    "id" uuid not null primary key references public.users(id) on delete cascade,
    "name" text not null,
    "date" timestamp with time zone not null default timezone('utc'::text, now()),
    "status" public.investor_status not null,
    "submittedBy" uuid references public.users(id) on delete set null,
    "rejectionReason" text,
    "isNotified" boolean default false,
    "installmentProfitShare" real not null default 70.0,
    "gracePeriodProfitShare" real not null default 33.3
);

-- Create Transactions table
create table if not exists public.transactions (
    "id" text not null primary key,
    "investor_id" uuid not null references public.investors(id) on delete cascade,
    "date" timestamp with time zone not null default timezone('utc'::text, now()),
    "type" public.transaction_type not null,
    "amount" real not null,
    "description" text not null,
    "withdrawalMethod" public.withdrawal_method,
    "capitalSource" public.capital_source not null
);

-- Create Support Tickets table
create table if not exists public.support_tickets (
    "id" text not null primary key,
    "date" timestamp with time zone not null default timezone('utc'::text, now()),
    "fromUserId" uuid not null references public.users(id) on delete cascade,
    "fromUserName" text not null,
    "fromUserEmail" text not null,
    "subject" text not null,
    "message" text not null,
    "isRead" boolean not null default false,
    "isReplied" boolean not null default false
);

-- Create Notifications table
create table if not exists public.notifications (
    "id" text not null primary key,
    "date" timestamp with time zone not null default timezone('utc'::text, now()),
    "recipientId" uuid not null references public.users(id) on delete cascade,
    "title" text not null,
    "description" text not null,
    "isRead" boolean not null default false
);


-- #=================================================================================
-- # D E F A U L T   D A T A (SEEDING)
-- #=================================================================================
-- Insert the System Admin user if it doesn't exist
-- Make sure to replace with your actual admin details
insert into public.users (id, name, email, phone, role, status)
values (
    'a5554f09-0d9a-4179-a718-d3c87560e060', -- Replace with your system admin's UUID from auth.users
    'مدير النظام',
    'admin@example.com',
    '0500000000',
    'مدير النظام',
    'نشط'
) on conflict (id) do nothing;

-- Insert default app configuration if it doesn't exist
insert into public.app_config (key, value, description) values
('baseInterestRate', '{"value": 15}', 'نسبة الربح السنوية الأساسية للقروض بالأقساط'),
('investorSharePercentage', '{"value": 70}', 'حصة المستثمر من أرباح قروض الأقساط'),
('salaryRepaymentPercentage', '{"value": 33.3}', 'نسبة السداد الشهرية من الراتب لتقدير قروض المهلة'),
('defaultTrialPeriodDays', '{"value": 14}', 'المدة الافتراضية للفترة التجريبية لمدراء المكاتب الجدد'),
('graceTotalProfitPercentage', '{"value": 10}', 'إجمالي نسبة الربح لقروض المهلة'),
('graceInvestorSharePercentage', '{"value": 50}', 'حصة المستثمر من إجمالي الربح لقروض المهلة'),
('supportEmail', '{"value": "support@example.com"}', 'البريد الإلكتروني لخدمة العملاء'),
('supportPhone', '{"value": "920000000"}', 'رقم الهاتف لخدمة العملاء')
on conflict (key) do nothing;


-- #=================================================================================
-- # R O W   L E V E L   S E C U R I T Y   (RLS)
-- #=================================================================================
alter table public.users enable row level security;
alter table public.branches enable row level security;
alter table public.borrowers enable row level security;
alter table public.investors enable row level security;
alter table public.transactions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.notifications enable row level security;
alter table public.app_config enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Allow all for authenticated users" on public.app_config;
drop policy if exists "Allow individual read access" on public.users;
drop policy if exists "Allow manager read access to their team" on public.users;
drop policy if exists "Allow system admin full access" on public.users;
-- Drop policies for other tables as well
-- (This part is crucial to ensure a clean slate before creating new policies)
-- ... drop other policies ...

-- Create RLS Policies
-- APP_CONFIG: Authenticated users can read.
create policy "Allow all for authenticated users" on public.app_config for select to authenticated with check (true);

-- USERS:
create policy "Allow individual read access" on public.users for select
    using (auth.uid() = id);
create policy "Allow manager read access to their team" on public.users for select
    using (
        (select role from public.users where id = auth.uid()) = 'مدير المكتب'
        and "managedBy" = auth.uid()
    );
create policy "Allow system admin full access" on public.users for all
    using ((select role from public.users where id = auth.uid()) = 'مدير النظام');

-- BRANCHES:
create policy "Allow manager access to their branches" on public.branches for all
    using (manager_id = auth.uid());
create policy "Allow system admin full access" on public.branches for all
    using ((select role from public.users where id = auth.uid()) = 'مدير النظام');

-- NOTIFICATIONS:
create policy "Users can only see their own notifications" on public.notifications for all
    using ( "recipientId" = auth.uid() );
create policy "System admin can see all notifications" on public.notifications for select
    using ((select role from public.users where id = auth.uid()) = 'مدير النظام');

-- SUPPORT TICKETS:
create policy "Users can see and create their own tickets" on public.support_tickets for all
    using ( "fromUserId" = auth.uid() );
create policy "System admin can see all tickets" on public.support_tickets for all
    using ((select role from public.users where id = auth.uid()) = 'مدير النظام');

-- General Policy for Manager Roles
create policy "Allow office managers to access their data" on public.borrowers for select
    using (
        (select role from public.users where id = auth.uid()) in ('مدير المكتب', 'مساعد مدير المكتب', 'موظف')
        and "submittedBy" in (
            select id from public.users where "managedBy" = (
                select "managedBy" from public.users where id = auth.uid()
            ) or id = (select "managedBy" from public.users where id = auth.uid())
        )
    );
create policy "Allow office managers to access their data" on public.investors for select
    using (
        (select role from public.users where id = auth.uid()) in ('مدير المكتب', 'مساعد مدير المكتب', 'موظف')
        and "submittedBy" in (
            select id from public.users where "managedBy" = (
                select "managedBy" from public.users where id = auth.uid()
            ) or id = (select "managedBy" from public.users where id = auth.uid())
        )
    );
-- Add similar policies for transactions

-- INVESTORS: Can see their own data
create policy "Investors can see their own data" on public.investors for select
    using ( id = auth.uid() );
create policy "Investors can see their own transactions" on public.transactions for select
    using ( investor_id = auth.uid() );

-- SYSTEM ADMIN: Full access
create policy "System admin has full access" on public.borrowers for all using ((select role from public.users where id = auth.uid()) = 'مدير النظام');
create policy "System admin has full access" on public.investors for all using ((select role from public.users where id = auth.uid()) = 'مدير النظام');
create policy "System admin has full access" on public.transactions for all using ((select role from public.users where id = auth.uid()) = 'مدير النظام');


-- #=================================================================================
-- # F U N C T I O N S   &   T R I G G E R S
-- #=================================================================================

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
    user_role public.user_role;
    manager_id uuid;
    trial_period_days integer;
begin
    -- Extract role and managedBy from metadata.
    -- COALESCE is used to safely handle cases where a value might be null.
    user_role := (new.raw_user_meta_data ->> 'user_role')::public.user_role;
    manager_id := (new.raw_user_meta_data ->> 'managedBy')::uuid;

    -- If the role is not provided, this will cause an error due to the NOT NULL constraint, which is what we want.
    if user_role is null then
      raise exception 'user_role cannot be null in user metadata';
    end if;
    
    insert into public.users (id, name, office_name, email, phone, role, "managedBy", status)
    values (
        new.id,
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'office_name', -- This can be null
        new.email,
        new.raw_user_meta_data ->> 'raw_phone_number',
        user_role,
        manager_id, -- This can be null for Office Managers
        'معلق' -- All new users start as 'pending'
    );

    -- If the new user is an Office Manager, set their trial period
    if user_role = 'مدير المكتب' then
        select (value ->> 'value')::integer into trial_period_days from public.app_config where key = 'defaultTrialPeriodDays';
        update public.users
        set "trialEndsAt" = timezone('utc'::text, now()) + (trial_period_days || ' days')::interval
        where id = new.id;
    end if;

    return new;
end;
$$;

-- Trigger to call the function on new user creation in auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update user data in public.users when auth.users is updated
create or replace function public.handle_update_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.users
  set
    email = new.email,
    phone = new.phone,
    name = new.raw_user_meta_data ->> 'full_name',
    office_name = new.raw_user_meta_data ->> 'office_name'
  where id = new.id;
  return new;
end;
$$;

-- Trigger to call the function on user update in auth.users
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, phone, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_update_user();
