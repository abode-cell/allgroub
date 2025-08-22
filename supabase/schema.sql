-- Create the pgcrypto extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ========= Dropping existing objects (for a clean slate) =========
DROP FUNCTION IF EXISTS public.create_office_manager(p_email text, p_password text, p_phone text, p_name text, p_office_name text) CASCADE;
DROP FUNCTION IF EXISTS public.create_investor_profile(p_user_id uuid, p_name text, p_email text, p_phone text, p_password text, p_office_id uuid, p_branch_id uuid, p_managed_by uuid, p_submitted_by uuid, p_installment_profit_share numeric, p_grace_period_profit_share numeric, p_initial_installment_capital numeric, p_initial_grace_capital numeric) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_claim(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_current_office_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.check_duplicate_borrower(p_national_id TEXT, p_office_id UUID) CASCADE;


DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.borrowers CASCADE;
DROP TABLE IF EXISTS public.investors CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.offices CASCADE;
DROP TABLE IF EXISTS public.app_config CASCADE;

DROP TYPE IF EXISTS "public"."user_role" CASCADE;
DROP TYPE IF EXISTS "public"."borrower_status" CASCADE;
DROP TYPE IF EXISTS "public"."borrower_payment_status" CASCADE;
DROP TYPE IF EXISTS "public"."investor_status" CASCADE;
DROP TYPE IF EXISTS "public"."loan_type" CASCADE;
DROP TYPE IF EXISTS "public"."transaction_type" CASCADE;
DROP TYPE IF EXISTS "public"."withdrawal_method" CASCADE;
DROP TYPE IF EXISTS "public"."installment_status" CASCADE;

-- ========= Creating Custom Types (ENUMs) =========
CREATE TYPE "public"."user_role" AS ENUM ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');
CREATE TYPE "public"."investor_status" AS ENUM ('نشط', 'غير نشط', 'معلق', 'مرفوض', 'محذوف');
CREATE TYPE "public"."borrower_status" AS ENUM ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');
CREATE TYPE "public"."loan_type" AS ENUM ('اقساط', 'مهلة');
CREATE TYPE "public"."transaction_type" AS ENUM ('إيداع رأس المال', 'سحب من رأس المال');
CREATE TYPE "public"."withdrawal_method" AS ENUM ('نقدي', 'بنكي');
CREATE TYPE "public"."installment_status" AS ENUM ('لم يسدد بعد', 'تم السداد', 'متأخر');
CREATE TYPE "public"."borrower_payment_status" AS ENUM ('منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد');


-- ========= Creating Tables =========

-- Application Configuration Table
CREATE TABLE public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);
COMMENT ON TABLE public.app_config IS 'Stores global application settings.';

-- Offices Table (NEW)
CREATE TABLE public.offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    manager_id UUID UNIQUE, -- Can be null initially, to be updated later
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.offices IS 'Stores independent office entities.';

-- Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
    branch_id UUID, -- This will be a foreign key later
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role public.user_role NOT NULL,
    status public.investor_status NOT NULL DEFAULT 'معلق',
    "managedBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    "registrationDate" TIMESTAMPTZ DEFAULT NOW(),
    "investorLimit" INT DEFAULT 50,
    "employeeLimit" INT DEFAULT 5,
    "assistantLimit" INT DEFAULT 2,
    "branchLimit" INT DEFAULT 3,
    "allowEmployeeSubmissions" BOOLEAN DEFAULT TRUE,
    "hideEmployeeInvestorFunds" BOOLEAN DEFAULT FALSE,
    "allowEmployeeLoanEdits" BOOLEAN DEFAULT FALSE,
    "trialEndsAt" TIMESTAMPTZ,
    "defaultTrialPeriodDays" INT
);
COMMENT ON TABLE public.users IS 'Stores user profiles, extending auth.users.';
ALTER TABLE public.offices ADD CONSTRAINT fk_manager_id FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- Branches Table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL
);
COMMENT ON TABLE public.branches IS 'Stores office branches linked to an office.';
ALTER TABLE public.users ADD CONSTRAINT fk_branch_id FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- Investors Table
CREATE TABLE public.investors (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    status public.investor_status NOT NULL DEFAULT 'معلق',
    "managedBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
    "submittedBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
    "rejectionReason" TEXT,
    "isNotified" BOOLEAN DEFAULT FALSE,
    "installmentProfitShare" NUMERIC,
    "gracePeriodProfitShare" NUMERIC
);
COMMENT ON TABLE public.investors IS 'Stores investor-specific data.';

-- Borrowers Table
CREATE TABLE public.borrowers (
    id TEXT PRIMARY KEY,
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    phone TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    rate NUMERIC,
    term NUMERIC,
    date TIMESTAMPTZ DEFAULT NOW(),
    "loanType" public.loan_type NOT NULL,
    status public.borrower_status NOT NULL,
    "dueDate" DATE NOT NULL,
    discount NUMERIC DEFAULT 0,
    "submittedBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
    "managedBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
    "rejectionReason" TEXT,
    "fundedBy" JSONB,
    "paymentStatus" public.borrower_payment_status,
    installments JSONB,
    "isNotified" BOOLEAN DEFAULT FALSE,
    "lastStatusChange" TIMESTAMPTZ,
    "paidOffDate" TIMESTAMPTZ,
    partial_payment_paid_amount NUMERIC,
    partial_payment_remaining_loan_id TEXT,
    "originalLoanId" TEXT
);
COMMENT ON TABLE public.borrowers IS 'Stores loan and borrower information.';

-- Transactions Table
CREATE TABLE public.transactions (
    id TEXT PRIMARY KEY,
    office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    date TIMESTAMPTZ DEFAULT NOW(),
    type public.transaction_type NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    "withdrawalMethod" public.withdrawal_method,
    "capitalSource" TEXT NOT NULL
);
COMMENT ON TABLE public.transactions IS 'Records financial transactions for investors.';

-- Support Tickets Table
CREATE TABLE public.support_tickets (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ DEFAULT NOW(),
    "fromUserId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "fromUserName" TEXT NOT NULL,
    "fromUserEmail" TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT FALSE,
    "isReplied" BOOLEAN DEFAULT FALSE
);
COMMENT ON TABLE public.support_tickets IS 'Stores support requests from users.';

-- Notifications Table
CREATE TABLE public.notifications (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ DEFAULT NOW(),
    "recipientId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    "isRead" BOOLEAN DEFAULT FALSE
);
COMMENT ON TABLE public.notifications IS 'Stores notifications for users.';

-- ========= Indexes for Performance =========
CREATE INDEX ON public.users ("office_id");
CREATE INDEX ON public.users ("branch_id");
CREATE INDEX ON public.borrowers ("office_id");
CREATE INDEX ON public.borrowers ("branch_id");
CREATE INDEX ON public.investors ("office_id");
CREATE INDEX ON public.investors ("branch_id");
CREATE INDEX ON public.transactions ("office_id");
CREATE INDEX ON public.branches ("office_id");

-- ========= Helper Functions for RLS Policies =========
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT)
RETURNS JSONB
LANGUAGE sql STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb->claim
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT get_my_claim('user_role') @> '"مدير النظام"'::jsonb;
$$;

CREATE OR REPLACE FUNCTION get_current_office_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT ((get_my_claim('office_id'))::text)::uuid
$$;


-- ========= Row Level Security (RLS) Policies =========

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;


-- POLICIES FOR: app_config
DROP POLICY IF EXISTS "Allow authenticated to read app_config" ON public.app_config;
CREATE POLICY "Allow authenticated to read app_config" ON public.app_config FOR SELECT TO authenticated USING (true);


-- POLICIES FOR: offices
DROP POLICY IF EXISTS "Allow admin to manage all offices" ON public.offices;
DROP POLICY IF EXISTS "Allow office members to see their office" ON public.offices;
CREATE POLICY "Allow admin to manage all offices" ON public.offices FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Allow office members to see their office" ON public.offices FOR SELECT TO authenticated USING (id = get_current_office_id());


-- POLICIES FOR: users
DROP POLICY IF EXISTS "Allow admin to manage all users" ON public.users;
DROP POLICY IF EXISTS "Allow users to view their own data" ON public.users;
DROP POLICY IF EXISTS "Allow office members to see each other" ON public.users;
DROP POLICY IF EXISTS "Allow users to update their own data" ON public.users;

CREATE POLICY "Allow admin to manage all users" ON public.users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow users to view their own data" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Allow office members to see each other" ON public.users FOR SELECT TO authenticated USING (office_id = get_current_office_id());
CREATE POLICY "Allow users to update their own data" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- POLICIES FOR: investors
DROP POLICY IF EXISTS "Allow admin to manage all investors" ON public.investors;
DROP POLICY IF EXISTS "Allow office members to manage their investors" ON public.investors;
DROP POLICY IF EXISTS "Allow investors to see their own profile" ON public.investors;

CREATE POLICY "Allow admin to manage all investors" ON public.investors FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Allow office members to manage their investors" ON public.investors FOR ALL TO authenticated USING (office_id = get_current_office_id());
CREATE POLICY "Allow investors to see their own profile" ON public.investors FOR SELECT TO authenticated USING (id = auth.uid());


-- POLICIES FOR: borrowers
DROP POLICY IF EXISTS "Allow admin to manage all borrowers" ON public.borrowers;
DROP POLICY IF EXISTS "Allow office members to manage their borrowers" ON public.borrowers;
DROP POLICY IF EXISTS "Allow investors to see loans they funded" ON public.borrowers;

CREATE POLICY "Allow admin to manage all borrowers" ON public.borrowers FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Allow office members to manage their borrowers" ON public.borrowers FOR ALL TO authenticated USING (office_id = get_current_office_id());
CREATE POLICY "Allow investors to see loans they funded" ON public.borrowers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM jsonb_array_elements("fundedBy") AS elem WHERE (elem->>'investorId')::UUID = auth.uid()));


-- POLICIES FOR: transactions
DROP POLICY IF EXISTS "Allow admin to manage all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow office members to manage their transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow investors to see their own transactions" ON public.transactions;

CREATE POLICY "Allow admin to manage all transactions" ON public.transactions FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Allow investors to see their own transactions" ON public.transactions FOR SELECT TO authenticated USING (investor_id = auth.uid());
CREATE POLICY "Allow office members to manage their transactions" ON public.transactions FOR ALL TO authenticated USING (office_id = get_current_office_id());


-- POLICIES FOR: branches
DROP POLICY IF EXISTS "Allow admin to manage all branches" ON public.branches;
DROP POLICY IF EXISTS "Allow office members to manage their branches" ON public.branches;

CREATE POLICY "Allow admin to manage all branches" ON public.branches FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Allow office members to manage their branches" ON public.branches FOR ALL TO authenticated USING (office_id = get_current_office_id());


-- POLICIES FOR: support_tickets AND notifications
DROP POLICY IF EXISTS "Allow admin to manage all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow users to manage their own submitted tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow users to manage their own notifications" ON public.notifications;

CREATE POLICY "Allow admin to manage all support tickets" ON public.support_tickets FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Allow users to manage their own submitted tickets" ON public.support_tickets FOR ALL TO authenticated USING (auth.uid() = "fromUserId");
CREATE POLICY "Allow users to manage their own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = "recipientId");


-- ========= Database Functions =========
CREATE OR REPLACE FUNCTION public.create_office_manager(
    p_email text,
    p_password text,
    p_phone text,
    p_name text,
    p_office_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_user_id uuid;
    new_office_id uuid;
    trial_period_days int;
BEGIN
    -- Step 1: Create the user in auth.users
    INSERT INTO auth.users (email, encrypted_password, phone, role, raw_app_meta_data)
    VALUES (p_email, extensions.crypt(p_password, extensions.gen_salt('bf')), p_phone, 'authenticated', '{"provider":"email","providers":["email"]}')
    RETURNING id INTO new_user_id;

    -- Step 2: Create the office
    INSERT INTO public.offices (name)
    VALUES (p_office_name)
    RETURNING id INTO new_office_id;

    -- Step 3: Get default trial period
    SELECT (value->>'value')::INT INTO trial_period_days FROM public.app_config WHERE key = 'defaultTrialPeriodDays' LIMIT 1;
    IF trial_period_days IS NULL THEN
        trial_period_days := 14; -- Default fallback
    END IF;

    -- Step 4: Create the user profile
    INSERT INTO public.users (id, name, email, phone, role, office_id, "trialEndsAt")
    VALUES (
        new_user_id,
        p_name,
        p_email,
        p_phone,
        'مدير المكتب',
        new_office_id,
        NOW() + (trial_period_days || ' days')::INTERVAL
    );
    
    -- Step 5: Link the office to the manager
    UPDATE public.offices SET manager_id = new_user_id WHERE id = new_office_id;
    
    RETURN new_user_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.create_investor_profile(
    p_user_id uuid, -- Can be NULL if creating a new user
    p_name text,
    p_email text,
    p_phone text,
    p_password text,
    p_office_id uuid,
    p_branch_id uuid,
    p_managed_by uuid,
    p_submitted_by uuid,
    p_installment_profit_share numeric,
    p_grace_period_profit_share numeric,
    p_initial_installment_capital numeric,
    p_initial_grace_capital numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_user_id uuid := p_user_id;
    new_investor_id uuid;
BEGIN
    -- Create a new auth user if p_user_id is NULL
    IF new_user_id IS NULL THEN
        INSERT INTO auth.users (email, encrypted_password, phone, role, raw_app_meta_data)
        VALUES (p_email, extensions.crypt(p_password, extensions.gen_salt('bf')), p_phone, 'authenticated', '{"provider":"email","providers":["email"]}')
        RETURNING id INTO new_user_id;
    END IF;

    -- Create the user profile
    INSERT INTO public.users (id, name, email, phone, role, office_id, branch_id, "managedBy", status)
    VALUES (new_user_id, p_name, p_email, p_phone, 'مستثمر', p_office_id, p_branch_id, p_managed_by, 'نشط');

    -- Create the investor profile
    INSERT INTO public.investors (id, office_id, branch_id, name, "managedBy", "submittedBy", status, "installmentProfitShare", "gracePeriodProfitShare")
    VALUES (new_user_id, p_office_id, p_branch_id, p_name, p_managed_by, p_submitted_by, 'نشط', p_installment_profit_share, p_grace_period_profit_share)
    RETURNING id INTO new_investor_id;

    -- Add initial capital transactions if provided
    IF p_initial_installment_capital > 0 THEN
        INSERT INTO public.transactions (id, office_id, investor_id, type, amount, description, "capitalSource")
        VALUES ('tx_init_inst_' || new_investor_id, p_office_id, new_investor_id, 'إيداع رأس المال', p_initial_installment_capital, 'رأس مال تأسيسي (أقساط)', 'installment');
    END IF;
    IF p_initial_grace_capital > 0 THEN
        INSERT INTO public.transactions (id, office_id, investor_id, type, amount, description, "capitalSource")
        VALUES ('tx_init_grace_' || new_investor_id, p_office_id, new_investor_id, 'إيداع رأس المال', p_initial_grace_capital, 'رأس مال تأسيسي (مهلة)', 'grace');
    END IF;

    RETURN new_investor_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.check_duplicate_borrower(
    p_national_id TEXT,
    p_office_id UUID
)
RETURNS TABLE (
    borrower_name TEXT,
    manager_id UUID,
    manager_phone TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
      b.name AS borrower_name,
      b."managedBy" AS manager_id,
      u.phone AS manager_phone
  FROM public.borrowers b
  JOIN public.users u ON b."managedBy" = u.id
  WHERE b."nationalId" = p_national_id
  AND b.office_id != p_office_id
  AND b.status != 'مرفوض'
  AND b."paymentStatus" != 'تم السداد'
  LIMIT 1;
$$;



-- ========= Initial Data Inserts =========
INSERT INTO public.app_config (key, value) VALUES
('baseInterestRate', '{"value": 15}'),
('investorSharePercentage', '{"value": 70}'),
('salaryRepaymentPercentage', '{"value": 65}'),
('graceTotalProfitPercentage', '{"value": 25}'),
('graceInvestorSharePercentage', '{"value": 33.3}'),
('supportEmail', '{"value": "qzmpty678@gmail.com"}'),
('supportPhone', '{"value": "0598360380"}'),
('defaultTrialPeriodDays', '{"value": 14}')
ON CONFLICT (key) DO NOTHING;
