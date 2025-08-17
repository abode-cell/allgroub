
-- Drop existing policies and functions if they exist to start fresh
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON "public"."users";
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON "public"."borrowers";
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON "public"."investors";
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON "public"."transactions";
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON "public"."notifications";
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON "public"."support_tickets";
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON "public"."app_config";
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON "public"."branches";

DROP FUNCTION IF EXISTS "public"."handle_new_user"();

-- Create ENUM types for better data integrity
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE public.user_status AS ENUM ('نشط', 'معلق', 'مرفوض', 'محذوف');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_type') THEN
        CREATE TYPE public.loan_type AS ENUM ('اقساط', 'مهلة');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_status') THEN
        CREATE TYPE public.loan_status AS ENUM ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');
    END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'borrower_payment_status') THEN
        CREATE TYPE public.borrower_payment_status AS ENUM ('منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'installment_status') THEN
      CREATE TYPE public.installment_status AS ENUM ('لم يسدد بعد', 'تم السداد', 'متأخر');
    END IF;
END
$$;

-- Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    office_name text,
    email text UNIQUE NOT NULL,
    phone text UNIQUE,
    role public.user_role NOT NULL,
    status public.user_status NOT NULL DEFAULT 'معلق',
    managedBy uuid REFERENCES public.users(id),
    registrationDate timestamptz DEFAULT now(),
    investorLimit integer DEFAULT 10,
    employeeLimit integer DEFAULT 5,
    assistantLimit integer DEFAULT 1,
    branchLimit integer DEFAULT 3,
    allowEmployeeSubmissions boolean DEFAULT false,
    hideEmployeeInvestorFunds boolean DEFAULT false,
    allowEmployeeLoanEdits boolean DEFAULT false,
    permissions jsonb,
    trialEndsAt timestamptz,
    defaultTrialPeriodDays integer
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    city text NOT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;


-- Create Investors Table
CREATE TABLE IF NOT EXISTS public.investors (
    id uuid NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    date timestamptz DEFAULT now(),
    status public.user_status NOT NULL DEFAULT 'معلق',
    submittedBy uuid REFERENCES public.users(id),
    rejectionReason text,
    isNotified boolean DEFAULT false,
    installmentProfitShare real,
    gracePeriodProfitShare real
);
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

-- Create Borrowers Table
CREATE TABLE IF NOT EXISTS public.borrowers (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    nationalId text NOT NULL,
    phone text NOT NULL,
    amount real NOT NULL,
    rate real,
    term real,
    date timestamptz DEFAULT now(),
    loanType public.loan_type NOT NULL,
    status public.loan_status NOT NULL,
    dueDate date NOT NULL,
    discount real,
    submittedBy uuid REFERENCES public.users(id),
    rejectionReason text,
    fundedBy jsonb,
    paymentStatus public.borrower_payment_status,
    installments jsonb,
    isNotified boolean DEFAULT false,
    lastStatusChange timestamptz,
    paidOffDate timestamptz,
    partial_payment_paid_amount real,
    partial_payment_remaining_loan_id text,
    originalLoanId text
);
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;


-- Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id text NOT NULL PRIMARY KEY,
    investor_id uuid REFERENCES public.investors(id),
    date timestamptz DEFAULT now(),
    type text NOT NULL,
    amount real NOT NULL,
    description text NOT NULL,
    withdrawalMethod text,
    capitalSource text
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;


-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id text NOT NULL PRIMARY KEY,
    date timestamptz DEFAULT now(),
    recipientId uuid REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text NOT NULL,
    isRead boolean DEFAULT false
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id text NOT NULL PRIMARY KEY,
    date timestamptz DEFAULT now(),
    fromUserId uuid REFERENCES public.users(id),
    fromUserName text,
    fromUserEmail text,
    subject text NOT NULL,
    message text NOT NULL,
    isRead boolean DEFAULT false,
    isReplied boolean DEFAULT false
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Create App Config Table
CREATE TABLE IF NOT EXISTS public.app_config (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Insert default app configuration if it doesn't exist
INSERT INTO public.app_config (key, value, description)
VALUES
    ('baseInterestRate', '{"value": 15}', 'Default annual interest rate for installment loans'),
    ('investorSharePercentage', '{"value": 70}', 'Default investor profit share from installment loan interest'),
    ('salaryRepaymentPercentage', '{"value": 65}', 'The maximum percentage of a salary that can be taken as a repayment for a grace loan'),
    ('graceTotalProfitPercentage', '{"value": 25}', 'The total profit percentage for grace period loans'),
    ('graceInvestorSharePercentage', '{"value": 33.3}', 'The investor''s share of the total profit for grace loans'),
    ('supportEmail', '{"value": "qzmpty678@gmail.com"}', 'The email address for user support inquiries'),
    ('supportPhone', '{"value": "0598360380"}', 'The phone number for user support inquiries'),
    ('defaultTrialPeriodDays', '{"value": 14}', 'The default trial period in days for new office managers')
ON CONFLICT (key) DO NOTHING;


-- This function will be triggered when a new user signs up.
-- It ensures that a corresponding record is created in the public.users table.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- This is important for permissions
AS $$
DECLARE
    user_role public.user_role;
    manager_id uuid;
    trial_period_days int;
BEGIN
    -- Extract role and managedBy from the user metadata, falling back to defaults if necessary.
    -- This makes the function more robust.
    user_role := (new.raw_user_meta_data->>'user_role')::public.user_role;
    manager_id := (new.raw_user_meta_data->>'managedBy')::uuid;

    -- If a new office manager signs up, set their trial period
    IF user_role = 'مدير المكتب' THEN
        -- Fetch the default trial period from app_config
        SELECT (value->>'value')::int INTO trial_period_days FROM public.app_config WHERE key = 'defaultTrialPeriodDays';
        
        INSERT INTO public.users (id, name, office_name, email, phone, role, status, managedBy, trialEndsAt)
        VALUES (
            new.id,
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'office_name',
            new.email,
            new.raw_user_meta_data->>'raw_phone_number',
            user_role,
            'معلق', -- Always pending for approval
            NULL,    -- Office managers are not managed by anyone
            now() + (COALESCE(trial_period_days, 14) || ' days')::interval
        );
    ELSE
        -- For other roles (investors, assistants, employees) created by an admin/manager
        INSERT INTO public.users (id, name, email, phone, role, status, managedBy)
        VALUES (
            new.id,
            new.raw_user_meta_data->>'full_name',
            new.email,
            new.raw_user_meta_data->>'raw_phone_number',
            user_role,
            'نشط', -- Subordinates are active by default
            manager_id
        );
    END IF;
    
    RETURN new;
END;
$$;

-- Create the trigger that calls the function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- RLS Policies
CREATE POLICY "Enable read access for all authenticated users" ON "public"."users"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON "public"."borrowers"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON "public"."investors"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON "public"."transactions"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON "public"."notifications"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON "public"."support_tickets"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON "public"."app_config"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read access for all authenticated users" ON "public"."branches"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);
