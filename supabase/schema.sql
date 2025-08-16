-- Define custom types
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');

DROP TYPE IF EXISTS public.borrower_status CASCADE;
CREATE TYPE public.borrower_status AS ENUM ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');

DROP TYPE IF EXISTS public.loan_type CASCADE;
CREATE TYPE public.loan_type AS ENUM ('اقساط', 'مهلة');

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  phone character varying,
  role user_role NOT NULL,
  office_name character varying,
  status character varying DEFAULT 'معلق'::character varying NOT NULL,
  "managedBy" uuid REFERENCES public.users(id),
  "registrationDate" timestamp with time zone DEFAULT now() NOT NULL,
  "investorLimit" integer DEFAULT 10,
  "employeeLimit" integer DEFAULT 5,
  "assistantLimit" integer DEFAULT 2,
  "branchLimit" integer DEFAULT 3,
  "allowEmployeeSubmissions" boolean DEFAULT false,
  "hideEmployeeInvestorFunds" boolean DEFAULT false,
  "allowEmployeeLoanEdits" boolean DEFAULT false,
  permissions jsonb,
  "trialEndsAt" timestamp with time zone,
  "defaultTrialPeriodDays" integer,
  "lastStatusChange" timestamp with time zone
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET SEARCH_PATH = public
AS $$
DECLARE
    trial_period_days INT;
BEGIN
    -- Set user role, defaulting to 'مستثمر' if not provided
    INSERT INTO public.users (id, name, email, role, office_name, phone, "managedBy", "trialEndsAt")
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.email,
        (new.raw_user_meta_data->>'user_role')::user_role,
        new.raw_user_meta_data->>'office_name',
        new.raw_user_meta_data->>'raw_phone_number',
        (new.raw_user_meta_data->>'managedBy')::uuid,
        CASE
            WHEN (new.raw_user_meta_data->>'user_role')::user_role = 'مدير المكتب' THEN
                (SELECT value->>'value' FROM public.app_config WHERE key = 'defaultTrialPeriodDays')::INT * interval '1 day' + now()
            ELSE
                NULL
        END
    );
    RETURN new;
END;
$$;

-- Trigger to execute the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Other tables (ensure they exist or add them here)
CREATE TABLE IF NOT EXISTS public.investors (
    id uuid NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    status character varying DEFAULT 'معلق'::character varying NOT NULL,
    "submittedBy" uuid,
    "rejectionReason" text,
    "isNotified" boolean DEFAULT false,
    "installmentProfitShare" numeric,
    "gracePeriodProfitShare" numeric
);

CREATE TABLE IF NOT EXISTS public.borrowers (
    id text NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    "nationalId" character varying NOT NULL,
    phone character varying NOT NULL,
    amount numeric NOT NULL,
    rate numeric,
    term integer,
    date timestamp with time zone DEFAULT now() NOT NULL,
    "loanType" loan_type NOT NULL,
    status borrower_status NOT NULL,
    "dueDate" date NOT NULL,
    discount numeric,
    "submittedBy" uuid,
    "rejectionReason" text,
    "fundedBy" jsonb,
    "paymentStatus" character varying,
    installments jsonb,
    "isNotified" boolean DEFAULT false,
    "lastStatusChange" timestamp with time zone,
    "paidOffDate" timestamp with time zone,
    "partialPayment" jsonb,
    "originalLoanId" text
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id text NOT NULL PRIMARY KEY,
    investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    date timestamp with time zone DEFAULT now() NOT NULL,
    type character varying NOT NULL,
    amount numeric NOT NULL,
    description text NOT NULL,
    "withdrawalMethod" character varying,
    "capitalSource" character varying
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id text NOT NULL PRIMARY KEY,
    date timestamp with time zone DEFAULT now() NOT NULL,
    "recipientId" uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id text NOT NULL PRIMARY KEY,
    date timestamp with time zone DEFAULT now() NOT NULL,
    "fromUserId" uuid NOT NULL,
    "fromUserName" character varying NOT NULL,
    "fromUserEmail" character varying NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "isReplied" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public.branches (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    city character varying NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_config (
    key text NOT NULL PRIMARY KEY,
    value jsonb NOT NULL
);

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;


-- Create RLS policies
DROP POLICY IF EXISTS "Allow public read access" ON public.app_config;
CREATE POLICY "Allow public read access" ON public.app_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow individual read access" ON public.notifications;
CREATE POLICY "Allow individual read access" ON public.notifications FOR SELECT USING (auth.uid() = "recipientId");

DROP POLICY IF EXISTS "Allow individual write access" ON public.notifications;
CREATE POLICY "Allow individual write access" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = "recipientId");

DROP POLICY IF EXISTS "Allow individual delete access" ON public.notifications;
CREATE POLICY "Allow individual delete access" ON public.notifications FOR DELETE USING (auth.uid() = "recipientId");

DROP POLICY IF EXISTS "Allow individual update access" ON public.notifications;
CREATE POLICY "Allow individual update access" ON public.notifications FOR UPDATE USING (auth.uid() = "recipientId");

DROP POLICY IF EXISTS "Allow all access to system admins" ON public.support_tickets;
CREATE POLICY "Allow all access to system admins" ON public.support_tickets FOR ALL USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام'
);

DROP POLICY IF EXISTS "Allow users to create tickets" ON public.support_tickets;
CREATE POLICY "Allow users to create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = "fromUserId");

-- RLS policies for other tables (to be added based on app logic)
-- Example for users table:
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
CREATE POLICY "Users can view their own data" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('مدير النظام', 'مدير المكتب')
);
