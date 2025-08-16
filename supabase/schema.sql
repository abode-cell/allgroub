-- supabase/schema.sql

-- 1. Create custom types
CREATE TYPE user_role AS ENUM ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');
CREATE TYPE borrower_status AS ENUM ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');
CREATE TYPE borrower_payment_status AS ENUM ('منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد');
CREATE TYPE installment_status AS ENUM ('لم يسدد بعد', 'تم السداد', 'متأخر');
CREATE TYPE investor_status AS ENUM ('نشط', 'غير نشط', 'معلق', 'مرفوض', 'محذوف');
CREATE TYPE transaction_type AS ENUM ('إيداع رأس المال', 'سحب من رأس المال');
CREATE TYPE withdrawal_method AS ENUM ('نقدي', 'بنكي');
CREATE TYPE capital_source AS ENUM ('installment', 'grace');

-- 2. Create users table
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id),
    name character varying,
    office_name character varying,
    email character varying UNIQUE,
    phone character varying UNIQUE,
    role user_role,
    status investor_status DEFAULT 'معلق',
    managedBy uuid REFERENCES public.users(id),
    registrationDate timestamp with time zone DEFAULT now(),
    trialEndsAt timestamp with time zone,
    investorLimit integer DEFAULT 10,
    employeeLimit integer DEFAULT 5,
    assistantLimit integer DEFAULT 2,
    branchLimit integer DEFAULT 3,
    allowEmployeeSubmissions boolean DEFAULT false,
    hideEmployeeInvestorFunds boolean DEFAULT false,
    allowEmployeeLoanEdits boolean DEFAULT false,
    permissions jsonb,
    lastStatusChange timestamp with time zone,
    defaultTrialPeriodDays integer DEFAULT 14
);

-- 3. Create other tables
CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    city character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.investors (
    id uuid NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name character varying,
    date timestamp with time zone DEFAULT now(),
    status investor_status,
    submittedBy uuid REFERENCES public.users(id),
    rejectionReason text,
    isNotified boolean DEFAULT false,
    installmentProfitShare double precision,
    gracePeriodProfitShare double precision
);

CREATE TABLE public.borrowers (
    id text NOT NULL PRIMARY KEY,
    name character varying,
    nationalId text,
    phone text,
    amount real,
    rate real,
    term real,
    date timestamp with time zone DEFAULT now(),
    loanType text,
    status borrower_status,
    dueDate date,
    discount real,
    submittedBy uuid REFERENCES public.users(id),
    rejectionReason text,
    fundedBy jsonb,
    paymentStatus borrower_payment_status,
    installments jsonb,
    isNotified boolean,
    lastStatusChange timestamp with time zone,
    paidOffDate timestamp with time zone,
    partial_payment_paid_amount real,
    partial_payment_remaining_loan_id text,
    originalLoanId text
);

CREATE TABLE public.transactions (
    id text NOT NULL PRIMARY KEY,
    investor_id uuid REFERENCES public.investors(id),
    date timestamp with time zone,
    type transaction_type,
    amount real,
    description text,
    withdrawalMethod withdrawal_method,
    capitalSource capital_source
);

CREATE TABLE public.notifications (
    id text NOT NULL PRIMARY KEY,
    date timestamp with time zone DEFAULT now(),
    recipientId uuid,
    title text,
    description text,
    isRead boolean DEFAULT false
);

CREATE TABLE public.support_tickets (
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

CREATE TABLE public.app_config (
    key text NOT NULL PRIMARY KEY,
    value jsonb
);

-- 4. Create the user handling function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, office_name, phone, managedBy, trialEndsAt)
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
            now() + interval '14 days' 
        ELSE
            NULL
    END
  );

  IF (new.raw_user_meta_data->>'user_role')::user_role = 'مستثمر' THEN
    INSERT INTO public.investors(id, name, status, submittedBy, date)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        'نشط',
        (new.raw_user_meta_data->>'submittedBy')::uuid,
        now()
    );
  END IF;

  RETURN new;
END;
$$;

-- 5. Create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Enable Row Level Security (RLS) and define policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Investors can see their own record" ON public.investors FOR SELECT USING (auth.uid() = id);

-- Add more policies as needed for other tables, e.g.:
-- CREATE POLICY "Allow full access to admins" ON public.users FOR ALL TO authenticated WITH CHECK (get_user_role(auth.uid()) = 'مدير النظام');
