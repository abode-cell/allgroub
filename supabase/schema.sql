-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.support_tickets;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.borrowers;
DROP TABLE IF EXISTS public.investors;
DROP TABLE IF EXISTS public.branches;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.app_config;
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.user_status;
DROP TYPE IF EXISTS public.borrower_status;
DROP TYPE IF EXISTS public.borrower_payment_status;
DROP TYPE IF EXISTS public.installment_status;
DROP TYPE IF EXISTS public.loan_type;
DROP TYPE IF EXISTS public.transaction_type;
DROP TYPE IF EXISTS public.withdrawal_method;
DROP TYPE IF EXISTS public.capital_source;

-- Create custom types
CREATE TYPE public.user_role AS ENUM ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');
CREATE TYPE public.user_status AS ENUM ('نشط', 'معلق', 'مرفوض', 'محذوف');
CREATE TYPE public.borrower_status AS ENUM ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');
CREATE TYPE public.borrower_payment_status AS ENUM ('منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد');
CREATE TYPE public.installment_status AS ENUM ('لم يسدد بعد', 'تم السداد', 'متأخر');
CREATE TYPE public.loan_type AS ENUM ('اقساط', 'مهلة');
CREATE TYPE public.transaction_type AS ENUM ('إيداع رأس المال', 'سحب من رأس المال');
CREATE TYPE public.withdrawal_method AS ENUM ('نقدي', 'بنكي');
CREATE TYPE public.capital_source AS ENUM ('installment', 'grace');

-- Create tables
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    office_name text,
    email text UNIQUE,
    phone text UNIQUE,
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'معلق',
    "managedBy" uuid REFERENCES public.users(id),
    "submittedBy" uuid REFERENCES public.users(id),
    "registrationDate" timestamptz DEFAULT now(),
    "trialEndsAt" timestamptz,
    "investorLimit" integer DEFAULT 10,
    "employeeLimit" integer DEFAULT 5,
    "assistantLimit" integer DEFAULT 2,
    "branchLimit" integer DEFAULT 3,
    "allowEmployeeSubmissions" boolean DEFAULT false,
    "hideEmployeeInvestorFunds" boolean DEFAULT false,
    "allowEmployeeLoanEdits" boolean DEFAULT false,
    permissions jsonb
);

CREATE TABLE public.branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    city text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.investors (
    id uuid NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    date timestamptz NOT NULL DEFAULT now(),
    status user_status NOT NULL DEFAULT 'معلق',
    "submittedBy" uuid REFERENCES public.users(id),
    "rejectionReason" text,
    "isNotified" boolean DEFAULT false,
    "installmentProfitShare" real,
    "gracePeriodProfitShare" real
);

CREATE TABLE public.borrowers (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    "nationalId" text NOT NULL,
    phone text NOT NULL,
    amount real NOT NULL,
    rate real,
    term real,
    date timestamptz NOT NULL,
    "loanType" loan_type NOT NULL,
    status borrower_status NOT NULL,
    "dueDate" date NOT NULL,
    discount real,
    "submittedBy" uuid REFERENCES public.users(id),
    "rejectionReason" text,
    "fundedBy" jsonb,
    "paymentStatus" borrower_payment_status,
    installments jsonb,
    "isNotified" boolean,
    "lastStatusChange" timestamptz,
    "paidOffDate" timestamptz,
    "partialPayment" jsonb,
    "originalLoanId" text
);

CREATE TABLE public.transactions (
    id text NOT NULL PRIMARY KEY,
    investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    date timestamptz NOT NULL,
    type transaction_type NOT NULL,
    amount real NOT NULL,
    description text,
    "withdrawalMethod" withdrawal_method,
    "capitalSource" capital_source
);

CREATE TABLE public.support_tickets (
    id text NOT NULL PRIMARY KEY,
    date timestamptz NOT NULL,
    "fromUserId" uuid NOT NULL,
    "fromUserName" text NOT NULL,
    "fromUserEmail" text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    "isRead" boolean NOT NULL,
    "isReplied" boolean NOT NULL
);

CREATE TABLE public.notifications (
    id text NOT NULL PRIMARY KEY,
    date timestamptz NOT NULL,
    "recipientId" uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "isRead" boolean NOT NULL
);

CREATE TABLE public.app_config (
    key text PRIMARY KEY,
    value jsonb
);

-- Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET SEARCH_PATH = public
AS $$
DECLARE
    user_role user_role;
    trial_days integer;
BEGIN
    user_role := (new.raw_user_meta_data->>'user_role')::user_role;
    
    INSERT INTO public.users (id, name, email, phone, role, office_name, "managedBy", "submittedBy")
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.email,
        new.raw_user_meta_data->>'raw_phone_number',
        user_role,
        new.raw_user_meta_data->>'office_name',
        (new.raw_user_meta_data->>'managedBy')::uuid,
        (new.raw_user_meta_data->>'submittedBy')::uuid
    );

    IF user_role = 'مدير المكتب' THEN
        SELECT (value->>'value')::integer INTO trial_days FROM public.app_config WHERE key = 'defaultTrialPeriodDays';
        UPDATE public.users SET "trialEndsAt" = now() + (COALESCE(trial_days, 14) * interval '1 day') WHERE id = new.id;
    END IF;

    RETURN new;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Allow individual read access to their own user record" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow system admin full access to all users" ON public.users FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام'
);
CREATE POLICY "Allow managers to see their subordinates" ON public.users FOR SELECT USING (
    "managedBy" = auth.uid() OR id = (SELECT "managedBy" FROM public.users WHERE id = auth.uid())
);

-- Policies for branches
CREATE POLICY "Managers can manage their own branches" ON public.branches FOR ALL
USING (auth.uid() = manager_id);

-- Policies for investors
CREATE POLICY "Allow users to see their own investor data" ON public.investors FOR SELECT
USING (auth.uid() = id);

-- Add other policies as needed for different tables...
CREATE POLICY "Allow full access to system admins on all tables" ON public.investors FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');
CREATE POLICY "Allow full access to system admins on all tables" ON public.borrowers FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');
CREATE POLICY "Allow full access to system admins on all tables" ON public.transactions FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');
CREATE POLICY "Allow full access to system admins on all tables" ON public.support_tickets FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');
CREATE POLICY "Allow full access to system admins on all tables" ON public.notifications FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');

-- Insert initial app config data
INSERT INTO public.app_config (key, value) VALUES
('salaryRepaymentPercentage', '{"value": 33}'),
('baseInterestRate', '{"value": 15}'),
('investorSharePercentage', '{"value": 70}'),
('graceTotalProfitPercentage', '{"value": 50}'),
('graceInvestorSharePercentage', '{"value": 66.6}'),
('supportEmail', '{"value": "qzmpty678@gmail.com"}'),
('supportPhone', '{"value": "0598360380"}'),
('defaultTrialPeriodDays', '{"value": 14}')
ON CONFLICT (key) DO NOTHING;

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
