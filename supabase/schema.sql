-- supabase/schema.sql

-- ========= Dropping existing objects (optional, for a clean slate) =========
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.get_my_claim(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_current_office_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.check_duplicate_borrower(p_national_id TEXT, p_office_id UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_investor_profile(p_user_id UUID, p_name TEXT, p_office_id UUID, p_branch_id UUID, p_managed_by UUID, p_submitted_by UUID, p_installment_profit_share NUMERIC, p_grace_period_profit_share NUMERIC, p_initial_installment_capital NUMERIC, p_initial_grace_capital NUMERIC) CASCADE;


DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.borrowers CASCADE;
DROP TABLE IF EXISTS public.investors CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.app_config CASCADE;

DROP TYPE IF EXISTS "public"."user_role" CASCADE;
DROP TYPE IF EXISTS "public"."borrower_status" CASCADE;
DROP TYPE IF EXISTS "public"."borrower_payment_status" CASCADE;
DROP TYPE IF EXISTS "public"."investor_status" CASCADE;
DROP TYPE IF EXISTS "public"."loan_type" CASCADE;
DROP TYPE IF EXISTS "public"."transaction_type" CASCADE;
DROP TYPE IF EXISTS "public"."withdrawal_method" CASCADE;
DROP TYPE IF EXISTS "public"."installment_status" CASCADE;

-- ========= Creating Custom Types (ENUMs) for Data Integrity =========
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


-- Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    office_id UUID,
    branch_id UUID,
    name TEXT NOT NULL,
    office_name TEXT,
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

-- Branches Table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL
);
COMMENT ON TABLE public.branches IS 'Stores office branches for an office manager.';
ALTER TABLE public.users ADD FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- Investors Table
CREATE TABLE public.investors (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    office_id UUID NOT NULL,
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
    office_id UUID NOT NULL,
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
    office_id UUID NOT NULL,
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
CREATE INDEX ON public.users ("managedBy");
CREATE INDEX ON public.users ("office_id");
CREATE INDEX ON public.users ("branch_id");
CREATE INDEX ON public.borrowers ("submittedBy");
CREATE INDEX ON public.borrowers ("managedBy");
CREATE INDEX ON public.borrowers ("office_id");
CREATE INDEX ON public.borrowers ("branch_id");
CREATE INDEX ON public.investors ("submittedBy");
CREATE INDEX ON public.investors ("managedBy");
CREATE INDEX ON public.investors ("office_id");
CREATE INDEX ON public.investors ("branch_id");
CREATE INDEX ON public.transactions (investor_id);
CREATE INDEX ON public.transactions ("office_id");
CREATE INDEX ON public.notifications ("recipientId");
CREATE INDEX ON public.borrowers ("nationalId");
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
  SELECT (get_my_claim('user_role'))::jsonb ? 'مدير النظام'
$$;

CREATE OR REPLACE FUNCTION get_current_office_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT (get_my_claim('office_id') ->> 0)::uuid
$$;


-- ========= Row Level Security (RLS) Policies =========

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
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


-- POLICIES FOR: users
DROP POLICY IF EXISTS "Allow admin to manage all users" ON public.users;
DROP POLICY IF EXISTS "Allow users to view their own data" ON public.users;
DROP POLICY IF EXISTS "Allow users to view their office members" ON public.users;
DROP POLICY IF EXISTS "Allow users to update their own data" ON public.users;

CREATE POLICY "Allow admin to manage all users" ON public.users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Allow users to view their own data" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Allow users to view their office members" ON public.users FOR SELECT TO authenticated USING (office_id = get_current_office_id());
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
DROP POLICY IF EXISTS "Allow office members to manage their transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow investors to see their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow admin to manage all transactions" ON public.transactions;

CREATE POLICY "Allow admin to manage all transactions" ON public.transactions FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Allow investors to see their own transactions" ON public.transactions FOR SELECT TO authenticated USING (investor_id = auth.uid());
CREATE POLICY "Allow office members to manage their transactions" ON public.transactions FOR ALL TO authenticated USING (office_id = get_current_office_id());


-- POLICIES FOR: branches
DROP POLICY IF EXISTS "Allow office managers to manage their own branches" ON public.branches;
DROP POLICY IF EXISTS "Allow office members to read branch data" ON public.branches;

CREATE POLICY "Allow office managers to manage their own branches" ON public.branches FOR ALL TO authenticated USING (office_id = auth.uid() AND (get_my_claim('user_role'))::jsonb ? 'مدير المكتب');
CREATE POLICY "Allow office members to read branch data" ON public.branches FOR SELECT TO authenticated USING (office_id = get_current_office_id());


-- POLICIES FOR: support_tickets AND notifications
DROP POLICY IF EXISTS "Allow admin to manage all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow users to manage their own submitted tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow users to manage their own notifications" ON public.notifications;

CREATE POLICY "Allow admin to manage all support tickets" ON public.support_tickets FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Allow users to manage their own submitted tickets" ON public.support_tickets FOR ALL TO authenticated USING (auth.uid() = "fromUserId");
CREATE POLICY "Allow users to manage their own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = "recipientId");


-- ========= Database Functions and Triggers =========

-- Function to check for duplicate borrowers in other offices
CREATE OR REPLACE FUNCTION public.check_duplicate_borrower(p_national_id TEXT, p_office_id UUID)
RETURNS TABLE(name TEXT, office_name TEXT, phone TEXT)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT u.name, u.office_name, u.phone
    FROM public.users u
    WHERE u.id IN (
        SELECT b."submittedBy"
        FROM public.borrowers b
        WHERE b."nationalId" = p_national_id
          AND b.office_id != p_office_id
          AND b.status NOT IN ('مرفوض', 'مسدد بالكامل')
    );
END;
$$;


-- This function is called by a trigger when a new user signs up in Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    user_role_text TEXT;
    user_managed_by UUID;
    user_office_id UUID;
    user_branch_id UUID;
    trial_period_days INT;
    trial_end_date TIMESTAMPTZ;
BEGIN
    -- Extract role and other metadata from the new user's metadata
    user_role_text := new.raw_user_meta_data->>'user_role';
    user_managed_by := (new.raw_user_meta_data->>'managedBy')::UUID;
    user_branch_id := (new.raw_user_meta_data->>'branch_id')::UUID;
    user_office_id := (new.raw_user_meta_data->>'office_id')::UUID;

    -- If the role is 'مدير المكتب', this is a new signup. The office_id is the user's own id.
    IF user_role_text = 'مدير المكتب' THEN
        -- Fetch the default trial period from app_config
        SELECT (value->>'value')::INT INTO trial_period_days FROM public.app_config WHERE key = 'defaultTrialPeriodDays' LIMIT 1;
        trial_period_days := COALESCE(trial_period_days, 14); -- Fallback to 14 days
        trial_end_date := NOW() + (trial_period_days || ' days')::interval;

        -- Insert the new office manager into the public.users table
        INSERT INTO public.users (id, name, office_name, email, phone, role, office_id, "trialEndsAt")
        VALUES (
            new.id,
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'office_name',
            new.email,
            new.raw_user_meta_data->>'raw_phone_number',
            user_role_text::public.user_role,
            new.id, -- The office_id is the manager's own id
            trial_end_date
        );
    ELSE
        -- For other roles (employee, assistant, investor), they are created by a manager.
        INSERT INTO public.users (id, name, email, phone, role, "managedBy", office_id, branch_id, status)
        VALUES (
            new.id,
            new.raw_user_meta_data->>'full_name',
            new.email,
            new.raw_user_meta_data->>'raw_phone_number',
            user_role_text::public.user_role,
            user_managed_by,
            user_office_id,
            user_branch_id,
            'نشط' -- Subordinates are activated immediately
        );
    END IF;

    RETURN new;
END;
$$;


-- Function to create an investor profile and initial capital transactions.
CREATE OR REPLACE FUNCTION public.create_investor_profile(
    p_user_id UUID,
    p_name TEXT,
    p_office_id UUID,
    p_branch_id UUID,
    p_managed_by UUID,
    p_submitted_by UUID,
    p_installment_profit_share NUMERIC,
    p_grace_period_profit_share NUMERIC,
    p_initial_installment_capital NUMERIC,
    p_initial_grace_capital NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Insert into the investors table
    INSERT INTO public.investors (id, name, office_id, branch_id, "managedBy", "submittedBy", "installmentProfitShare", "gracePeriodProfitShare", status)
    VALUES (
        p_user_id,
        p_name,
        p_office_id,
        p_branch_id,
        p_managed_by,
        p_submitted_by,
        p_installment_profit_share,
        p_grace_period_profit_share,
        'نشط'
    );

    -- Insert initial capital for installments if provided
    IF p_initial_installment_capital > 0 THEN
        INSERT INTO public.transactions (id, office_id, investor_id, type, amount, description, "capitalSource")
        VALUES (
            'tx_' || gen_random_uuid(),
            p_office_id,
            p_user_id,
            'إيداع رأس المال',
            p_initial_installment_capital,
            'إيداع رأس مال تأسيسي - أقساط',
            'installment'
        );
    END IF;

    -- Insert initial capital for grace period if provided
    IF p_initial_grace_capital > 0 THEN
        INSERT INTO public.transactions (id, office_id, investor_id, type, amount, description, "capitalSource")
        VALUES (
            'tx_' || gen_random_uuid(),
            p_office_id,
            p_user_id,
            'إيداع رأس المال',
            p_initial_grace_capital,
            'إيداع رأس مال تأسيسي - مهلة',
            'grace'
        );
    END IF;
END;
$$;



-- Trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


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
```