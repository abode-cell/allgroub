-- supabase/schema.sql

-- 1. Create Custom Types
CREATE TYPE public.user_role AS ENUM ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');
CREATE TYPE public.user_status AS ENUM ('نشط', 'معلق', 'مرفوض', 'محذوف');
CREATE TYPE public.loan_type AS ENUM ('اقساط', 'مهلة');
CREATE TYPE public.loan_status AS ENUM ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');
CREATE TYPE public.payment_status AS ENUM ('منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد');
CREATE TYPE public.installment_status AS ENUM ('لم يسدد بعد', 'تم السداد', 'متأخر');
CREATE TYPE public.transaction_type AS ENUM ('إيداع رأس المال', 'سحب من رأس المال');
CREATE TYPE public.withdrawal_method AS ENUM ('نقدي', 'بنكي');

-- 2. Create Users Table
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    office_name text,
    email character varying NOT NULL UNIQUE,
    phone text,
    role public.user_role NOT NULL,
    status public.user_status NOT NULL DEFAULT 'معلق'::public.user_status,
    managed_by uuid REFERENCES public.users(id),
    submitted_by uuid REFERENCES public.users(id),
    registration_date timestamptz DEFAULT now(),
    trial_ends_at timestamptz,
    default_trial_period_days integer,
    investor_limit integer,
    employee_limit integer,
    assistant_limit integer,
    branch_limit integer,
    allow_employee_submissions boolean,
    hide_employee_investor_funds boolean,
    allow_employee_loan_edits boolean,
    permissions jsonb,
    last_status_change timestamptz
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Create Other Tables
CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    city text NOT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.investors (
    id uuid NOT NULL PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    date timestamptz DEFAULT now(),
    status public.user_status NOT NULL,
    submitted_by uuid REFERENCES public.users(id),
    rejection_reason text,
    is_notified boolean,
    installment_profit_share numeric,
    grace_period_profit_share numeric
);
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.borrowers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    national_id text,
    phone text,
    amount numeric,
    rate numeric,
    term integer,
    date timestamptz DEFAULT now(),
    loan_type public.loan_type,
    status public.loan_status,
    due_date date,
    discount numeric,
    submitted_by uuid REFERENCES public.users(id),
    rejection_reason text,
    funded_by jsonb,
    payment_status public.payment_status,
    installments jsonb,
    is_notified boolean,
    last_status_change timestamptz,
    paid_off_date timestamptz,
    partial_payment jsonb,
    original_loan_id uuid
);
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id uuid REFERENCES public.investors(id) ON DELETE CASCADE,
    date timestamptz DEFAULT now(),
    type public.transaction_type,
    amount numeric,
    description text,
    withdrawal_method public.withdrawal_method,
    capital_source text
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    date timestamptz DEFAULT now(),
    title text,
    description text,
    is_read boolean DEFAULT false
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date timestamptz DEFAULT now(),
    from_user_id uuid REFERENCES public.users(id),
    from_user_name text,
    from_user_email text,
    subject text,
    message text,
    is_read boolean DEFAULT false,
    is_replied boolean DEFAULT false
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_config (
    key text PRIMARY KEY,
    value jsonb
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 4. Create handle_new_user function and trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, office_name, phone, status)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    (new.raw_user_meta_data->>'role')::public.user_role,
    new.raw_user_meta_data->>'office_name',
    new.raw_user_meta_data->>'raw_phone_number',
    'معلق' -- Default status for new managers
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- 5. Row Level Security Policies
-- Users can see their own data
CREATE POLICY "Users can see their own data" ON public.users FOR SELECT USING (auth.uid() = id);
-- Users can update their own data
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Enable RLS for all tables and define policies
CREATE POLICY "Enable read access for all users" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.investors FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.borrowers FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Users can read their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Enable insert for authenticated users" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can read all support tickets" ON public.support_tickets FOR SELECT USING (exists (select 1 from users where id = auth.uid() and role = 'مدير النظام'));
CREATE POLICY "Enable read access for all users" ON public.app_config FOR SELECT USING (true);


-- 6. RPC Functions
CREATE OR REPLACE FUNCTION get_user_data_and_context(user_id_param uuid)
RETURNS TABLE(
    users_data json,
    investors_data json,
    borrowers_data json,
    transactions_data json,
    notifications_data json,
    support_tickets_data json,
    app_config_data json,
    branches_data json
)
LANGUAGE plpgsql
AS $$
DECLARE
    current_user_role user_role;
    current_user_managed_by uuid;
    manager_id uuid;
BEGIN
    SELECT role, managedBy INTO current_user_role, current_user_managed_by
    FROM public.users
    WHERE id = user_id_param;

    IF current_user_role = 'مدير النظام' THEN
        manager_id := NULL;
    ELSIF current_user_role = 'مدير المكتب' THEN
        manager_id := user_id_param;
    ELSE
        manager_id := current_user_managed_by;
    END IF;

    RETURN QUERY
    SELECT
        (SELECT json_agg(t) FROM public.users t),
        (SELECT json_agg(t) FROM public.investors t),
        (SELECT json_agg(t) FROM public.borrowers t),
        (SELECT json_agg(t) FROM public.transactions t),
        (SELECT json_agg(t) FROM public.notifications t WHERE t.recipient_id = user_id_param),
        (SELECT json_agg(t) FROM public.support_tickets t WHERE current_user_role = 'مدير النظام' OR t.from_user_id = user_id_param),
        (SELECT json_agg(t) FROM public.app_config t),
        (SELECT json_agg(t) FROM public.branches t);
END;
$$;


CREATE OR REPLACE FUNCTION set_app_config(key_to_set text, value_to_set jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.app_config(key, value)
  VALUES (key_to_set, value_to_set)
  ON CONFLICT (key)
  DO UPDATE SET value = value_to_set;
END;
$$;


-- 7. Initial App Config Data
INSERT INTO public.app_config (key, value)
VALUES
    ('baseInterestRate', '{"value": 15}'),
    ('investorSharePercentage', '{"value": 70}'),
    ('graceTotalProfitPercentage', '{"value": 50}'),
    ('graceInvestorSharePercentage', '{"value": 33.3}'),
    ('salaryRepaymentPercentage', '{"value": 60}'),
    ('supportEmail', '{"value": "qzmpty678@gmail.com"}'),
    ('supportPhone', '{"value": "0598360380"}'),
    ('defaultTrialPeriodDays', '{"value": 14}')
ON CONFLICT (key) DO NOTHING;
