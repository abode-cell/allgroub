-- supabase/schema.sql

-- Drop existing objects if they exist, in the correct order
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.support_tickets;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.borrowers;
DROP TABLE IF EXISTS public.investors;
DROP TABLE IF EXISTS public.branches;
DROP TABLE IF EXISTS public.users;
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.user_status;
DROP TYPE IF EXISTS public.borrower_loan_type;
DROP TYPE IF EXISTS public.borrower_status;
DROP TYPE IF EXISTS public.borrower_payment_status;
DROP TYPE IF EXISTS public.installment_status;
DROP TYPE IF EXISTS public.transaction_type;
DROP TYPE IF EXISTS public.withdrawal_method;

-- Create custom types
CREATE TYPE public.user_role AS ENUM ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');
CREATE TYPE public.user_status AS ENUM ('نشط', 'معلق', 'مرفوض', 'محذوف');
CREATE TYPE public.borrower_loan_type AS ENUM ('اقساط', 'مهلة');
CREATE TYPE public.borrower_status AS ENUM ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');
CREATE TYPE public.borrower_payment_status AS ENUM ('منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد');
CREATE TYPE public.installment_status AS ENUM ('لم يسدد بعد', 'تم السداد', 'متأخر');
CREATE TYPE public.transaction_type AS ENUM ('إيداع رأس المال', 'سحب من رأس المال');
CREATE TYPE public.withdrawal_method AS ENUM ('نقدي', 'بنكي');

-- Create users table
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    office_name character varying,
    email character varying NOT NULL UNIQUE,
    phone character varying,
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'معلق',
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
    lastStatusChange timestamp with time zone,
    trialEndsAt timestamp with time zone,
    defaultTrialPeriodDays integer
);

-- Create branches table
CREATE TABLE public.branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    city character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Create investors table
CREATE TABLE public.investors (
    id uuid NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    date timestamp with time zone DEFAULT now(),
    status user_status NOT NULL DEFAULT 'معلق',
    submittedBy uuid REFERENCES public.users(id),
    rejectionReason text,
    isNotified boolean DEFAULT false,
    installmentProfitShare numeric,
    gracePeriodProfitShare numeric
);

-- Create borrowers table
CREATE TABLE public.borrowers (
    id text NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    nationalId character varying NOT NULL,
    phone character varying NOT NULL,
    amount numeric NOT NULL,
    rate numeric,
    term integer,
    date timestamp with time zone DEFAULT now(),
    loanType borrower_loan_type NOT NULL,
    status borrower_status NOT NULL,
    dueDate date NOT NULL,
    discount numeric,
    submittedBy uuid REFERENCES public.users(id),
    rejectionReason text,
    fundedBy jsonb,
    paymentStatus borrower_payment_status,
    installments jsonb,
    isNotified boolean DEFAULT false,
    lastStatusChange timestamp with time zone,
    paidOffDate timestamp with time zone,
    partial_payment_paid_amount numeric,
    partial_payment_remaining_loan_id text,
    originalLoanId text
);

-- Create transactions table
CREATE TABLE public.transactions (
    id text NOT NULL PRIMARY KEY,
    investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    date timestamp with time zone DEFAULT now(),
    type transaction_type NOT NULL,
    amount numeric NOT NULL,
    description text,
    withdrawalMethod withdrawal_method,
    capitalSource character varying(20)
);

-- Create support_tickets table
CREATE TABLE public.support_tickets (
    id text NOT NULL PRIMARY KEY,
    date timestamp with time zone DEFAULT now(),
    fromUserId uuid NOT NULL REFERENCES public.users(id),
    fromUserName character varying NOT NULL,
    fromUserEmail character varying NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    isRead boolean DEFAULT false,
    isReplied boolean DEFAULT false
);

-- Create notifications table
CREATE TABLE public.notifications (
    id text NOT NULL PRIMARY KEY,
    date timestamp with time zone DEFAULT now(),
    recipientId uuid NOT NULL REFERENCES public.users(id),
    title text NOT NULL,
    description text NOT NULL,
    isRead boolean DEFAULT false
);

-- Create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone, role, office_name, managedBy)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'raw_phone_number',
    (new.raw_user_meta_data->>'user_role')::user_role,
    new.raw_user_meta_data->>'office_name',
    (new.raw_user_meta_data->>'managedBy')::uuid
  );
  RETURN new;
END;
$$;

-- Create the trigger to execute the function
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
