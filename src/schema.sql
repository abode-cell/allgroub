--
-- Enable RLS
--
alter table "public"."borrowers" enable row level security;
alter table "public"."investors" enable row level security;
alter table "public"."profiles" enable row level security;
--
-- Policies
--
-- 1. Profiles are visible to everyone
create policy "Profiles are visible to everyone" on "public"."profiles"
as permissive for select
to public
using (true);
-- 2. Users can insert their own profile
create policy "Users can insert their own profile" on "public"."profiles"
as permissive for insert
to public
with check (auth.uid() = id);
-- 3. Users can update their own profile
create policy "Users can update their own profile" on "public"."profiles"
as permissive for update
to public
using (auth.uid() = id);
-- 4. Borrowers can be read by authenticated users
create policy "Borrowers are visible to authenticated users" on "public"."borrowers"
as permissive for select
to authenticated
using (true);
-- 5. Investors can be read by authenticated users
create policy "Investors are visible to authenticated users" on "public"."investors"
as permissive for select
to authenticated
using (true);
-- 6. Allow logged-in users to insert data
create policy "Allow insert for authenticated users" on "public"."borrowers"
as permissive for insert
to authenticated
with check (true);
create policy "Allow insert for authenticated users" on "public"."investors"
as permissive for insert
to authenticated
with check (true);
-- 7. Allow updates by admin/manager roles
create policy "Allow updates by admin/manager" on "public"."borrowers"
as permissive for update
to authenticated
using ((get_my_claim('role'::text) = '"مدير النظام"'::jsonb) OR (get_my_claim('role'::text) = '"مدير المكتب"'::jsonb))
with check ((get_my_claim('role'::text) = '"مدير النظام"'::jsonb) OR (get_my_claim('role'::text) = '"مدير المكتب"'::jsonb));
create policy "Allow updates by admin/manager" on "public"."investors"
as permissive for update
to authenticated
using ((get_my_claim('role'::text) = '"مدير النظام"'::jsonb) OR (get_my_claim('role'::text) = '"مدير المكتب"'::jsonb))
with check ((get_my_claim('role'::text) = '"مدير النظام"'::jsonb) OR (get_my_claim('role'::text) = '"مدير المكتب"'::jsonb));
-- 8. Allow deletes by system admin
create policy "Allow delete by system admin" on "public"."profiles"
as permissive for delete
to authenticated
using ((get_my_claim('role'::text) = '"مدير النظام"'::jsonb));
--
-- Custom Claims function
--
create or replace function get_my_claim(claim text)
    returns jsonb
    language sql
    stable
as $$
    select nullif(current_setting('request.jwt.claims', true), '')::jsonb -> claim
$$;
--
-- Tables
--
-- Profiles Table
create table if not exists public.profiles (
    id uuid not null,
    name text,
    email text,
    "photoURL" text,
    role text,
    status text,
    constraint profiles_pkey primary key (id),
    constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade
);
-- Borrowers Table
create table if not exists public.borrowers (
    id uuid not null default gen_random_uuid(),
    name text,
    amount numeric,
    rate numeric,
    term integer,
    date text,
    "loanType" text,
    status text,
    "dueDate" text,
    "submittedBy" uuid,
    "rejectionReason" text,
    constraint borrowers_pkey primary key (id)
);
-- Investors Table
create table if not exists public.investors (
    id uuid not null default gen_random_uuid(),
    name text,
    amount numeric,
    date text,
    status text,
    "withdrawalHistory" jsonb,
    "fundedLoanIds" jsonb,
    "defaultedFunds" numeric,
    "submittedBy" uuid,
    "rejectionReason" text,
    constraint investors_pkey primary key (id)
);
--
-- Seed Data
--
-- Seed data for testing purposes
-- Note: Replace placeholders with actual UUIDs from your auth.users table if needed.
-- You can get user UUIDs after they sign up in your application.
-- For now, we will use placeholders and you might need to adjust them.
-- Get the UUID of the user with email 'admin@system.com'
-- This is a placeholder, you should replace with a real UUID from your auth.users table
-- after an admin user is created.
-- DO NOT RUN THIS SEED DATA IF YOU HAVE YOUR OWN DATA
-- INSERT INTO public.profiles (id, name, email, "photoURL", role, status)
-- VALUES
--     ('uuid_for_admin', 'Admin User', 'admin@system.com', 'https://placehold.co/40x40.png', 'مدير النظام', 'نشط'),
--     ('uuid_for_manager', 'Manager User', 'manager@office.com', 'https://placehold.co/40x40.png', 'مدير المكتب', 'نشط'),
--     ('uuid_for_employee', 'Employee User', 'employee@office.com', 'https://placehold.co/40x40.png', 'موظف', 'نشط');
--
-- INSERT INTO public.investors (name, amount, date, status, "withdrawalHistory", "fundedLoanIds", "defaultedFunds", "submittedBy")
-- VALUES
--     ('شركة الاستثمار الأولى', 500000, '2023-01-15', 'نشط', '[]', '[]', 0, 'uuid_for_admin'),
--     ('مجموعة الأفق القابضة', 750000, '2023-02-20', 'نشط', '[]', '[]', 0, 'uuid_for_admin');
--
-- INSERT INTO public.borrowers (name, amount, rate, term, date, "loanType", status, "dueDate", "submittedBy")
-- VALUES
--     ('أحمد المحمدي', 50000, 5.5, 5, '2023-03-10', 'اقساط', 'منتظم', '2028-03-10', 'uuid_for_employee'),
--     ('فاطمة الزهراء', 120000, 6.2, 10, '2023-04-01', 'اقساط', 'متأخر', '2033-04-01', 'uuid_for_employee');
