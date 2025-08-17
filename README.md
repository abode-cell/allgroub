# مرحبًا بك في مشروعك!

لإعداد قاعدة البيانات الخاصة بك في Supabase، يرجى نسخ الكود الكامل من هنا، ثم لصقه بالكامل في **SQL Editor** في لوحة تحكم Supabase، والضغط على **RUN**.

```sql
-- ========= Dropping existing objects (optional, for a clean slate) =========
-- This section can be commented out if you are updating an existing database and are sure about the changes.
-- However, for a fresh start, it's useful to drop old objects to avoid conflicts.
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop tables in reverse order of dependency
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.borrowers CASCADE;
DROP TABLE IF EXISTS public.investors CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.app_config CASCADE;

-- ========= Creating Tables =========

-- Application Configuration Table
CREATE TABLE public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT
);

-- Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    office_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر')),
    status TEXT NOT NULL DEFAULT 'معلق' CHECK (status IN ('نشط', 'معلق', 'مرفوض', 'محذوف')),
    managedBy UUID REFERENCES public.users(id),
    permissions JSONB DEFAULT '{}'::jsonb,
    registrationDate TIMESTAMPTZ DEFAULT NOW(),
    -- Limits for Office Managers
    investorLimit INT DEFAULT 10,
    employeeLimit INT DEFAULT 5,
    assistantLimit INT DEFAULT 2,
    branchLimit INT DEFAULT 3,
    -- Settings for Office Managers
    allowEmployeeSubmissions BOOLEAN DEFAULT TRUE,
    hideEmployeeInvestorFunds BOOLEAN DEFAULT FALSE,
    allowEmployeeLoanEdits BOOLEAN DEFAULT FALSE,
    -- Trial Period for Office Managers
    trialEndsAt TIMESTAMPTZ,
    defaultTrialPeriodDays INT -- Only for System Admin
);
COMMENT ON TABLE public.users IS 'Stores user profiles, extending auth.users.';
COMMENT ON COLUMN public.users.managedBy IS 'Link to the Office Manager who manages this user.';

-- Branches Table
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL
);
COMMENT ON TABLE public.branches IS 'Stores office branches for an office manager.';

-- Investors Table
CREATE TABLE public.investors (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'معلق' CHECK (status IN ('نشط', 'غير نشط', 'معلق', 'مرفوض', 'محذوف')),
    submittedBy UUID REFERENCES public.users(id),
    rejectionReason TEXT,
    isNotified BOOLEAN DEFAULT FALSE,
    installmentProfitShare NUMERIC,
    gracePeriodProfitShare NUMERIC
);
COMMENT ON TABLE public.investors IS 'Stores investor-specific data.';

-- Borrowers Table
CREATE TABLE public.borrowers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nationalId TEXT NOT NULL,
    phone TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    rate NUMERIC,
    term NUMERIC,
    date TIMESTAMPTZ DEFAULT NOW(),
    loanType TEXT NOT NULL CHECK (loanType IN ('اقساط', 'مهلة')),
    status TEXT NOT NULL CHECK (status IN ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض')),
    dueDate DATE NOT NULL,
    discount NUMERIC DEFAULT 0,
    submittedBy UUID REFERENCES public.users(id),
    rejectionReason TEXT,
    fundedBy JSONB,
    paymentStatus TEXT,
    installments JSONB,
    isNotified BOOLEAN DEFAULT FALSE,
    lastStatusChange TIMESTAMPTZ,
    paidOffDate TIMESTAMPTZ,
    partial_payment_paid_amount NUMERIC,
    partial_payment_remaining_loan_id TEXT,
    originalLoanId TEXT
);
COMMENT ON TABLE public.borrowers IS 'Stores loan and borrower information.';

-- Transactions Table
CREATE TABLE public.transactions (
    id TEXT PRIMARY KEY,
    investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    date TIMESTAMPTZ DEFAULT NOW(),
    type TEXT NOT NULL CHECK (type IN ('إيداع رأس المال', 'سحب من رأس المال')),
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    withdrawalMethod TEXT,
    capitalSource TEXT NOT NULL CHECK (capitalSource IN ('installment', 'grace'))
);
COMMENT ON TABLE public.transactions IS 'Records financial transactions for investors.';

-- Support Tickets Table
CREATE TABLE public.support_tickets (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ DEFAULT NOW(),
    fromUserId UUID NOT NULL REFERENCES public.users(id),
    fromUserName TEXT NOT NULL,
    fromUserEmail TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    isRead BOOLEAN DEFAULT FALSE,
    isReplied BOOLEAN DEFAULT FALSE
);
COMMENT ON TABLE public.support_tickets IS 'Stores support requests from users.';

-- Notifications Table
CREATE TABLE public.notifications (
    id TEXT PRIMARY KEY,
    date TIMESTAMTz DEFAULT NOW(),
    recipientId UUID NOT NULL REFERENCES public.users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    isRead BOOLEAN DEFAULT FALSE
);
COMMENT ON TABLE public.notifications IS 'Stores notifications for users.';

-- ========= Indexes for Performance =========
CREATE INDEX ON public.users (managedBy);
CREATE INDEX ON public.borrowers (submittedBy);
CREATE INDEX ON public.investors (submittedBy);
CREATE INDEX ON public.transactions (investor_id);
CREATE INDEX ON public.notifications (recipientId);
CREATE INDEX ON public.borrowers (nationalId);


-- ========= Row Level Security (RLS) Policies =========

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Policies for 'users' table
CREATE POLICY "Users can view their own data and subordinates" ON public.users FOR SELECT USING (
    auth.uid() = id OR -- Can see own profile
    id IN (SELECT u.id FROM public.users u WHERE u.managedBy = auth.uid()) -- Manager can see their subs
);
CREATE POLICY "System Admins can view all users" ON public.users FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام'
);
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (
    auth.uid() = id
) WITH CHECK (
    auth.uid() = id
);
CREATE POLICY "Admins can update users" ON public.users FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('مدير النظام', 'مدير المكتب')
);

-- Policies for 'investors' table
CREATE POLICY "Authenticated users can view investors" ON public.investors FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for 'borrowers' table
CREATE POLICY "Authenticated users can view borrowers" ON public.borrowers FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for 'transactions' table
CREATE POLICY "Users can view their own transactions or their investors transactions" ON public.transactions FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'مستثمر' AND investor_id = auth.uid() OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير المكتب' AND investor_id IN (SELECT id FROM public.users WHERE managedBy = auth.uid())
);

-- Policies for 'notifications' table
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (recipientId = auth.uid());
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (recipientId = auth.uid());

-- Policies for 'support_tickets' table
CREATE POLICY "Users can create support tickets" ON public.support_tickets FOR INSERT WITH CHECK (fromUserId = auth.uid());
CREATE POLICY "Admin can manage all support tickets" ON public.support_tickets FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');

-- Policies for 'branches' table
CREATE POLICY "Managers can manage their own branches" ON public.branches FOR ALL USING (manager_id = auth.uid());

-- Policies for 'app_config' table
CREATE POLICY "Authenticated users can read app config" ON public.app_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System admins can update app config" ON public.app_config FOR UPDATE USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');


-- ========= Database Functions and Triggers =========

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    user_managed_by UUID;
    user_submitted_by UUID;
    trial_period_days INT;
    trial_end_date TIMESTAMPTZ;
BEGIN
    -- Extract role, managedBy, and submittedBy from metadata, providing defaults
    user_role := new.raw_user_meta_data->>'user_role';
    user_managed_by := (new.raw_user_meta_data->>'managedBy')::UUID;
    user_submitted_by := (new.raw_user_meta_data->>'submittedBy')::UUID;

    -- If the role is 'مدير المكتب', set their trial period
    IF user_role = 'مدير المكتب' THEN
        -- Get the default trial period from app_config
        SELECT (value->>'value')::INT INTO trial_period_days FROM public.app_config WHERE key = 'defaultTrialPeriodDays' LIMIT 1;
        -- If not found, default to 14 days
        IF trial_period_days IS NULL THEN
            trial_period_days := 14;
        END IF;
        trial_end_date := NOW() + (trial_period_days || ' days')::interval;
    ELSE
        trial_end_date := NULL;
    END IF;

    -- Insert into public.users
    INSERT INTO public.users (id, name, email, phone, role, managedBy, trialEndsAt, office_name)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.email,
        new.raw_user_meta_data->>'raw_phone_number',
        user_role,
        user_managed_by,
        trial_end_date,
        new.raw_user_meta_data->>'office_name'
    );

    -- If the new user is an 'investor', create a corresponding investor profile
    IF user_role = 'مستثمر' THEN
        INSERT INTO public.investors (id, name, status, submittedBy)
        VALUES (
            new.id,
            new.raw_user_meta_data->>'full_name',
            'نشط', -- Investors created by managers are active by default now
            user_submitted_by
        );
    END IF;

    RETURN new;
END;
$$;

-- Trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========= Initial Data Inserts =========
INSERT INTO public.app_config (key, value, description) VALUES
('baseInterestRate', '{"value": 15}', 'Default annual interest rate for installment loans'),
('investorSharePercentage', '{"value": 70}', 'Default percentage of profit that goes to the investor for installment loans'),
('salaryRepaymentPercentage', '{"value": 65}', 'Maximum percentage of a person''s salary that can go towards a single grace period loan repayment'),
('graceTotalProfitPercentage', '{"value": 25}', 'Total profit percentage for a grace period loan (e.g., 25% means total repayment is 125% of principal)'),
('graceInvestorSharePercentage', '{"value": 33.3}', 'Percentage of the *total profit* from a grace loan that goes to the investor'),
('supportEmail', '{"value": "qzmpty678@gmail.com"}', 'Contact email for support inquiries'),
('supportPhone', '{"value": "0598360380"}', 'Contact phone for support inquiries'),
('defaultTrialPeriodDays', '{"value": 14}', 'Default trial period in days for new office managers');

```

