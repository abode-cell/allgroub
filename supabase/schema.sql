
-- Drop existing policies and functions to ensure a clean slate
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."app_config";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."app_config";
DROP POLICY IF EXISTS "Allow delete for users based on user_id" ON "public"."borrowers";
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."borrowers";
DROP POLICY IF EXISTS "Allow update for users based on user_id" ON "public"."borrowers";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."borrowers";
DROP POLICY IF EXISTS "Allow delete for users based on user_id" ON "public"."investors";
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."investors";
DROP POLICY IF EXISTS "Allow update for users based on user_id" ON "public"."investors";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."investors";
DROP POLICY IF EXISTS "Allow delete for users based on user_id" ON "public"."notifications";
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."notifications";
DROP POLICY IF EXISTS "Allow update for users based on user_id" ON "public"."notifications";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."notifications";
DROP POLICY IF EXISTS "Allow delete for users based on user_id" ON "public"."support_tickets";
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."support_tickets";
DROP POLICY IF EXISTS "Allow update for users based on user_id" ON "public"."support_tickets";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."support_tickets";
DROP POLICY IF EXISTS "Allow delete for users based on user_id" ON "public"."transactions";
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."transactions";
DROP POLICY IF EXISTS "Allow update for users based on user_id" ON "public"."transactions";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."transactions";
DROP POLICY IF EXISTS "Allow delete for users based on user_id" ON "public"."users";
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON "public"."users";
DROP POLICY IF EXISTS "Allow update for users based on user_id" ON "public"."users";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."users";
DROP POLICY IF EXISTS "Allow users to update their own profiles" ON "public"."users";
DROP POLICY IF EXISTS "Allow users to read their own user data" ON "public"."users";
DROP POLICY IF EXISTS "Enable all for service_role" ON "public"."branches";
DROP POLICY IF EXISTS "Allow manager to access their branches" ON "public"."branches";


DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate Tables
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name character varying,
    office_name character varying,
    email character varying UNIQUE,
    phone character varying UNIQUE,
    role character varying NOT NULL,
    status character varying DEFAULT 'معلق',
    managedBy uuid REFERENCES public.users(id),
    registrationDate timestamp with time zone DEFAULT now(),
    investorLimit integer DEFAULT 10,
    employeeLimit integer DEFAULT 5,
    assistantLimit integer DEFAULT 2,
    branchLimit integer DEFAULT 3,
    allowEmployeeSubmissions boolean DEFAULT false,
    hideEmployeeInvestorFunds boolean DEFAULT false,
    allowEmployeeLoanEdits boolean DEFAULT false,
    permissions jsonb,
    trialEndsAt timestamp with time zone,
    lastStatusChange timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.investors (
    id uuid NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name character varying,
    date timestamp with time zone DEFAULT now(),
    status character varying,
    submittedBy uuid,
    rejectionReason text,
    isNotified boolean DEFAULT false,
    installmentProfitShare double precision,
    gracePeriodProfitShare double precision
);

CREATE TABLE IF NOT EXISTS public.borrowers (
    id text NOT NULL PRIMARY KEY,
    name character varying,
    nationalId text,
    phone text,
    amount double precision,
    rate double precision,
    term double precision,
    date timestamp with time zone DEFAULT now(),
    loanType text,
    status character varying,
    dueDate date,
    discount double precision,
    submittedBy uuid,
    rejectionReason text,
    fundedBy jsonb,
    paymentStatus text,
    installments jsonb,
    isNotified boolean DEFAULT false,
    lastStatusChange timestamp with time zone,
    paidOffDate timestamp with time zone,
    partial_payment_paid_amount double precision,
    partial_payment_remaining_loan_id text,
    originalLoanId text
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id text NOT NULL PRIMARY KEY,
    investor_id uuid REFERENCES public.investors(id) ON DELETE CASCADE,
    date timestamp with time zone DEFAULT now(),
    type text,
    amount double precision,
    description text,
    withdrawalMethod text,
    capitalSource text
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id text NOT NULL PRIMARY KEY,
    date timestamp with time zone DEFAULT now(),
    recipientId uuid,
    title text,
    description text,
    isRead boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id text NOT NULL PRIMARY KEY,
    date timestamp with time zone DEFAULT now(),
    fromUserId uuid,
    fromUserName text,
    fromUserEmail text,
    subject text,
    message text,
    isRead boolean DEFAULT false,
    isReplied boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.app_config (
    key text NOT NULL PRIMARY KEY,
    value jsonb,
    description text
);

CREATE TABLE IF NOT EXISTS public.branches (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name character varying,
    city character varying,
    created_at timestamp with time zone DEFAULT now()
);


-- New, more robust handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role_from_meta text;
  trial_period_days integer;
  new_trial_ends_at timestamp with time zone;
BEGIN
  -- Extract user role from metadata, defaulting to 'مدير المكتب' if not present
  user_role_from_meta := new.raw_user_meta_data->>'user_role';

  -- Get the default trial period from app_config
  SELECT (value->>'value')::integer INTO trial_period_days FROM public.app_config WHERE key = 'defaultTrialPeriodDays' LIMIT 1;
  
  -- If not found in config, use a fallback
  IF trial_period_days IS NULL THEN
    trial_period_days := 14;
  END IF;

  -- Calculate trial end date only for 'مدير المكتب'
  IF user_role_from_meta = 'مدير المكتب' THEN
    new_trial_ends_at := now() + (trial_period_days * interval '1 day');
  ELSE
    new_trial_ends_at := null;
  END IF;
  
  -- Insert into public.users table
  INSERT INTO public.users (id, name, office_name, email, phone, role, managedBy, trialEndsAt)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'office_name',
    new.email,
    new.raw_user_meta_data->>'raw_phone_number',
    user_role_from_meta,
    (new.raw_user_meta_data->>'managedBy')::uuid,
    new_trial_ends_at
  );
  
  RETURN new;
END;
$$;

-- Recreate Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON "public"."users" FOR SELECT USING (true);
CREATE POLICY "Allow users to update their own profiles" ON "public"."users" FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON "public"."investors" FOR SELECT USING (true);

ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON "public"."borrowers" FOR SELECT USING (true);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON "public"."transactions" FOR SELECT USING (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON "public"."notifications" FOR SELECT USING (true);
CREATE POLICY "Allow users to manage their own notifications" ON public.notifications
    FOR ALL
    USING (auth.uid() = "recipientId")
    WITH CHECK (auth.uid() = "recipientId");

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON "public"."support_tickets" FOR SELECT USING (true);
CREATE POLICY "System admins can manage all tickets" ON public.support_tickets
    FOR ALL
    USING (public.is_system_admin(auth.uid()))
    WITH CHECK (public.is_system_admin(auth.uid()));
CREATE POLICY "Users can create their own tickets" ON public.support_tickets
    FOR INSERT
    WITH CHECK (auth.uid() = "fromUserId");

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON "public"."app_config" FOR SELECT USING (true);
CREATE POLICY "Enable all access for system admins" ON "public"."app_config"
    FOR ALL
    USING (public.is_system_admin(auth.uid()))
    WITH CHECK (public.is_system_admin(auth.uid()));

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for service_role" ON "public"."branches" TO service_role FOR ALL USING (true);
CREATE POLICY "Allow manager to access their branches" ON "public"."branches" 
    FOR ALL 
    USING (auth.uid() = manager_id);


-- Helper Function for RLS
CREATE OR REPLACE FUNCTION public.is_system_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = user_id;
  RETURN user_role = 'مدير النظام';
END;
$$;


-- Initial App Config Data (run this only once)
INSERT INTO public.app_config (key, value, description) VALUES
('baseInterestRate', '{"value": 15}', 'نسبة الربح السنوية الافتراضية لقروض الأقساط'),
('investorSharePercentage', '{"value": 70}', 'حصة المستثمر الافتراضية من أرباح قروض الأقساط'),
('graceTotalProfitPercentage', '{"value": 20}', 'إجمالي نسبة الربح من أصل القرض لقروض المهلة'),
('graceInvestorSharePercentage', '{"value": 50}', 'حصة المستثمر من إجمالي الربح في قروض المهلة'),
('salaryRepaymentPercentage', '{"value": 65}', 'النسبة القصوى المسموح بخصمها من الراتب لقروض المهلة'),
('supportEmail', '{"value": "qzmpty678@gmail.com"}', 'البريد الإلكتروني لجهة الدعم الفني'),
('supportPhone', '{"value": "0598360380"}', 'رقم الهاتف لجهة الدعم الفني'),
('defaultTrialPeriodDays', '{"value": 14}', 'المدة بالأيام للفترة التجريبية لحسابات مدراء المكاتب')
ON CONFLICT (key) DO NOTHING;

    