
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;


-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow users to read their own data" ON public.users;
DROP POLICY IF EXISTS "Allow managers to read their team data" ON public.users;
DROP POLICY IF EXISTS "Allow admin to read all users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read investors" ON public.investors;
DROP POLICY IF EXISTS "Allow authenticated users to read borrowers" ON public.borrowers;
DROP POLICY IF EXISTS "Allow authenticated users to read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow users to read their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow admin to read all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow users to read their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Allow authenticated users to read app_config" ON public.app_config;
DROP POLICY IF EXISTS "Allow managers to read their branches" ON public.branches;


-- Create Policies for public.users
CREATE POLICY "Allow users to read their own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Allow managers to read their team data"
ON public.users FOR SELECT
USING (id IN (
  SELECT user_id FROM get_managed_user_ids(auth.uid())
));

CREATE POLICY "Allow admin to read all users"
ON public.users FOR SELECT
USING (get_my_claim('user_role')::text = 'مدير النظام');

-- Create Policies for other tables
CREATE POLICY "Allow authenticated users to read investors"
ON public.investors FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read borrowers"
ON public.borrowers FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read transactions"
ON public.transactions FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow users to read their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = "recipientId");

CREATE POLICY "Allow admin to read all support tickets"
ON public.support_tickets FOR SELECT
USING (get_my_claim('user_role')::text = 'مدير النظام');

CREATE POLICY "Allow users to read their own support tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = "fromUserId");

CREATE POLICY "Allow authenticated users to read app_config"
ON public.app_config FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow managers to read their branches"
ON public.branches FOR SELECT
USING (auth.uid() = manager_id);


-- Helper function to get the role of the current user from the JWT claim
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT) RETURNS TEXT AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> claim, '')::TEXT;
$$ LANGUAGE sql STABLE;

-- Helper function to get the user's role from the users table
CREATE OR REPLACE FUNCTION get_user_role(user_id_input UUID) RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = user_id_input;
$$ LANGUAGE sql STABLE;

-- Helper function to recursively get all users managed by a manager
CREATE OR REPLACE FUNCTION get_managed_user_ids(manager_id_input UUID)
RETURNS TABLE(user_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE managed_users AS (
    -- Start with the direct subordinates of the manager
    SELECT id FROM public.users WHERE managed_by = manager_id_input
    UNION ALL
    -- Recursively find subordinates of subordinates
    SELECT u.id FROM public.users u
    INNER JOIN managed_users mu ON u.managed_by = mu.id
  )
  -- Add the manager themselves to the list
  SELECT manager_id_input
  UNION
  SELECT id FROM managed_users;
END;
$$ LANGUAGE plpgsql STABLE;


-- Trigger to copy user data from auth.users to public.users and assign trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  manager_id_val UUID;
  user_role_val TEXT;
  office_name_val TEXT;
  phone_val TEXT;
  trial_days INTEGER;
BEGIN
  -- Extract user role and managed_by from user_metadata
  user_role_val := NEW.raw_user_meta_data ->> 'user_role';
  manager_id_val := (NEW.raw_user_meta_data ->> 'managedBy')::UUID;
  office_name_val := NEW.raw_user_meta_data ->> 'office_name';
  phone_val := NEW.raw_user_meta_data ->> 'raw_phone_number';

  -- Get the default trial period from app_config
  SELECT value ->> 'value' INTO trial_days FROM public.app_config WHERE key = 'defaultTrialPeriodDays' LIMIT 1;
  IF trial_days IS NULL THEN
    trial_days := 14; -- Fallback value
  END IF;

  INSERT INTO public.users (id, name, email, phone, role, managed_by, office_name, status, trialEndsAt)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    phone_val,
    user_role_val,
    manager_id_val,
    office_name_val,
    'معلق', -- Always start as 'pending' for admin/manager approval
    CASE
      WHEN user_role_val = 'مدير المكتب' THEN NOW() + (trial_days || ' days')::INTERVAL
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set custom claims on user's JWT
CREATE OR REPLACE FUNCTION public.get_user_claims(uid UUID)
RETURNS jsonb AS $$
DECLARE
    claims jsonb;
BEGIN
    SELECT
        jsonb_build_object(
            'user_role', u.role,
            'user_status', u.status,
            'managed_by', u.managed_by
        )
    INTO claims
    FROM public.users u
    WHERE u.id = uid;
    RETURN claims;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to update a user's JWT claims
CREATE OR REPLACE FUNCTION public.update_user_claims()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM auth.update_user_by_id(NEW.id, '{"claims": ' || get_user_claims(NEW.id)::text || '}');
        RETURN NEW;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update claims when user data changes
DROP TRIGGER IF EXISTS on_user_data_change ON public.users;
CREATE TRIGGER on_user_data_change
  AFTER INSERT OR UPDATE OF role, status, managed_by ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_user_claims();


-- Create Tables
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  office_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'معلق',
  managed_by UUID REFERENCES public.users(id),
  permissions JSONB,
  investorLimit INTEGER DEFAULT 10,
  employeeLimit INTEGER DEFAULT 5,
  assistantLimit INTEGER DEFAULT 2,
  branchLimit INTEGER DEFAULT 3,
  allowEmployeeSubmissions BOOLEAN DEFAULT TRUE,
  hideEmployeeInvestorFunds BOOLEAN DEFAULT FALSE,
  allowEmployeeLoanEdits BOOLEAN DEFAULT FALSE,
  registrationDate TIMESTAMPTZ DEFAULT NOW(),
  trialEndsAt TIMESTAMPTZ,
  lastStatusChange TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.investors (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'معلق',
  submittedBy UUID REFERENCES public.users(id),
  rejectionReason TEXT,
  isNotified BOOLEAN DEFAULT FALSE,
  installmentProfitShare REAL,
  gracePeriodProfitShare REAL
);

CREATE TABLE IF NOT EXISTS public.borrowers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nationalId TEXT NOT NULL,
  phone TEXT NOT NULL,
  amount REAL NOT NULL,
  rate REAL,
  term REAL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  loanType TEXT NOT NULL,
  status TEXT NOT NULL,
  dueDate TEXT NOT NULL,
  discount REAL,
  submittedBy UUID REFERENCES public.users(id),
  rejectionReason TEXT,
  fundedBy JSONB,
  paymentStatus TEXT,
  installments JSONB,
  isNotified BOOLEAN DEFAULT FALSE,
  lastStatusChange TIMESTAMPTZ,
  paidOffDate TIMESTAMPTZ,
  partial_payment_paid_amount REAL,
  partial_payment_remaining_loan_id TEXT,
  originalLoanId TEXT
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  withdrawalMethod TEXT,
  capitalSource TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fromUserId UUID NOT NULL,
    fromUserName TEXT NOT NULL,
    fromUserEmail TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    isRead BOOLEAN DEFAULT FALSE,
    isReplied BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recipientId UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    isRead BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT
);

-- Seed app_config table with default values
INSERT INTO public.app_config (key, value, description) VALUES
  ('baseInterestRate', '{"value": 15}', 'نسبة الربح السنوية الأساسية لقروض الأقساط'),
  ('investorSharePercentage', '{"value": 70}', 'حصة المستثمر من أرباح قروض الأقساط'),
  ('graceTotalProfitPercentage', '{"value": 50}', 'إجمالي نسبة الربح من أصل القرض لقروض المهلة'),
  ('graceInvestorSharePercentage', '{"value": 33.3}', 'حصة المستثمر من إجمالي الربح لقروض المهلة'),
  ('salaryRepaymentPercentage', '{"value": 65}', 'نسبة السداد القصوى من الراتب الشهري لتمويل المهلة'),
  ('supportEmail', '{"value": "qzmpty678@gmail.com"}', 'البريد الإلكتروني لخدمة العملاء'),
  ('supportPhone', '{"value": "0598360380"}', 'رقم الهاتف لخدمة العملاء'),
  ('defaultTrialPeriodDays', '{"value": 14}', 'المدة الافتراضية للفترة التجريبية لحسابات مدراء المكاتب')
ON CONFLICT (key) DO NOTHING;
