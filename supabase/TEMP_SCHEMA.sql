
-- Drop existing functions and triggers to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop existing tables in reverse order of dependency
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.support_tickets;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.borrowers;
DROP TABLE IF EXISTS public.investors;
DROP TABLE IF EXISTS public.branches;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.app_config;


-- Create app_config table
CREATE TABLE public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to everyone" ON public.app_config FOR SELECT USING (true);


-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    office_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر')),
    status TEXT NOT NULL DEFAULT 'معلق' CHECK (status IN ('نشط', 'معلق', 'مرفوض', 'محذوف')),
    managedBy UUID REFERENCES public.users(id),
    submittedBy UUID REFERENCES public.users(id),
    permissions JSONB,
    investorLimit INT DEFAULT 10,
    employeeLimit INT DEFAULT 5,
    assistantLimit INT DEFAULT 2,
    branchLimit INT DEFAULT 3,
    allowEmployeeSubmissions BOOLEAN DEFAULT false,
    hideEmployeeInvestorFunds BOOLEAN DEFAULT false,
    allowEmployeeLoanEdits BOOLEAN DEFAULT false,
    registrationDate TIMESTAMPTZ DEFAULT NOW(),
    trialEndsAt TIMESTAMPTZ,
    defaultTrialPeriodDays INT
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to read their own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow system admin to read all users" ON public.users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'مدير النظام'));
CREATE POLICY "Allow office managers to read their subordinates" ON public.users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'مدير المكتب') AND managedBy = auth.uid());
CREATE POLICY "Allow users to update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow system admin to update users" ON public.users FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'مدير النظام'));


-- Create branches table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow manager to manage their own branches" ON public.branches FOR ALL USING (manager_id = auth.uid());
CREATE POLICY "Allow system admin to read all branches" ON public.branches FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'مدير النظام'));


-- Create investors table
CREATE TABLE public.investors (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('نشط', 'غير نشط', 'معلق', 'مرفوض', 'محذوف')),
    submittedBy UUID REFERENCES public.users(id),
    rejectionReason TEXT,
    isNotified BOOLEAN DEFAULT false,
    installmentProfitShare NUMERIC,
    gracePeriodProfitShare NUMERIC
);
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to see their own investor profile" ON public.investors FOR SELECT USING (id = auth.uid());
CREATE POLICY "Allow office managers to see their investors" ON public.investors FOR SELECT USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'مدير المكتب' AND submittedBy = auth.uid()));


-- Create borrowers table
CREATE TABLE public.borrowers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nationalId TEXT,
    phone TEXT,
    amount NUMERIC NOT NULL,
    rate NUMERIC,
    term NUMERIC,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    loanType TEXT NOT NULL CHECK (loanType IN ('اقساط', 'مهلة')),
    status TEXT NOT NULL CHECK (status IN ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض')),
    dueDate TEXT,
    discount NUMERIC,
    submittedBy UUID REFERENCES public.users(id),
    rejectionReason TEXT,
    fundedBy JSONB,
    paymentStatus TEXT,
    installments JSONB,
    isNotified BOOLEAN DEFAULT false,
    lastStatusChange TIMESTAMPTZ,
    paidOffDate TIMESTAMPTZ,
    partial_payment_paid_amount NUMERIC,
    partial_payment_remaining_loan_id TEXT
);
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow office managers to manage their borrowers" ON public.borrowers FOR ALL USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'مدير المكتب' AND submittedBy = auth.uid()));
CREATE POLICY "Allow investors to see loans they funded" ON public.borrowers FOR SELECT USING (EXISTS (SELECT 1 FROM jsonb_array_elements(fundedBy) AS funder WHERE (funder->>'investorId')::uuid = auth.uid()));


-- Create transactions table
CREATE TABLE public.transactions (
    id TEXT PRIMARY KEY,
    investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    withdrawalMethod TEXT,
    capitalSource TEXT NOT NULL
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow investor to see their own transactions" ON public.transactions FOR SELECT USING (investor_id = auth.uid());
CREATE POLICY "Allow office managers to see transactions of their investors" ON public.transactions FOR SELECT USING (investor_id IN (SELECT id FROM investors WHERE submittedBy = auth.uid()));


-- Create support_tickets table
CREATE TABLE public.support_tickets (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fromUserId UUID NOT NULL REFERENCES public.users(id),
    fromUserName TEXT NOT NULL,
    fromUserEmail TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    isRead BOOLEAN DEFAULT false,
    isReplied BOOLEAN DEFAULT false
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to create tickets" ON public.support_tickets FOR INSERT WITH CHECK (fromUserId = auth.uid());
CREATE POLICY "Allow system admin to manage tickets" ON public.support_tickets FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'مدير النظام'));


-- Create notifications table
CREATE TABLE public.notifications (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recipientId UUID NOT NULL REFERENCES public.users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    isRead BOOLEAN DEFAULT false
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to manage their own notifications" ON public.notifications FOR ALL USING (recipientId = auth.uid());

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_status TEXT;
  manager_id UUID;
  submitter_id UUID;
  trial_period_days INT;
  trial_end_date TIMESTAMPTZ;
BEGIN
  -- Extract user_role from metadata, default to 'مدير المكتب' if not provided for safety
  user_role := NEW.raw_user_meta_data->>'user_role';
  
  -- Determine status and trial period for new Office Managers
  IF user_role = 'مدير المكتب' THEN
    user_status := 'معلق';
    SELECT (value->>'value')::INT INTO trial_period_days FROM public.app_config WHERE key = 'defaultTrialPeriodDays';
    trial_end_date := NOW() + (COALESCE(trial_period_days, 14) * INTERVAL '1 day');
  ELSE
    user_status := 'نشط';
    trial_end_date := NULL;
  END IF;

  -- Get managedBy and submittedBy from metadata if they exist
  manager_id := (NEW.raw_user_meta_data->>'managedBy')::UUID;
  submitter_id := (NEW.raw_user_meta_data->>'submittedBy')::UUID;

  -- Insert into public.users table
  INSERT INTO public.users (
    id, 
    name, 
    office_name,
    email, 
    phone, 
    role, 
    status,
    managedBy,
    submittedBy,
    trialEndsAt
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'office_name',
    NEW.email,
    NEW.raw_user_meta_data->>'raw_phone_number',
    user_role,
    user_status,
    manager_id,
    submitter_id,
    trial_end_date
  );

  -- If the new user is an investor, create an investor profile
  IF user_role = 'مستثمر' THEN
    INSERT INTO public.investors (id, name, status, submittedBy)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'نشط', manager_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Seed initial data for app_config
INSERT INTO public.app_config (key, value) VALUES
('baseInterestRate', '{"value": 15}'),
('investorSharePercentage', '{"value": 70}'),
('salaryRepaymentPercentage', '{"value": 33}'),
('graceTotalProfitPercentage', '{"value": 20}'),
('graceInvestorSharePercentage', '{"value": 50}'),
('supportEmail', '{"value": "qzmpty678@gmail.com"}'),
('supportPhone', '{"value": "0598360380"}'),
('defaultTrialPeriodDays', '{"value": 14}')
ON CONFLICT (key) DO NOTHING;

