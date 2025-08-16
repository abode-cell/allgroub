
-- Create custom types
CREATE TYPE public.user_role AS ENUM ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');
CREATE TYPE public.user_status AS ENUM ('نشط', 'معلق', 'مرفوض', 'محذوف');
CREATE TYPE public.loan_type AS ENUM ('اقساط', 'مهلة');
CREATE TYPE public.loan_status AS ENUM ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');
CREATE TYPE public.borrower_payment_status AS ENUM ('منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد');
CREATE TYPE public.installment_status AS ENUM ('لم يسدد بعد', 'تم السداد', 'متأخر');
CREATE TYPE public.transaction_type AS ENUM ('إيداع رأس المال', 'سحب من رأس المال');
CREATE TYPE public.withdrawal_method AS ENUM ('نقدي', 'بنكي');
CREATE TYPE public.capital_source AS ENUM ('installment', 'grace');

-- Create users table
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY,
    name character varying,
    office_name character varying,
    email character varying,
    phone character varying,
    role public.user_role,
    status public.user_status DEFAULT 'معلق'::public.user_status,
    managed_by uuid,
    registration_date timestamp with time zone DEFAULT now(),
    investor_limit integer DEFAULT 10,
    employee_limit integer DEFAULT 5,
    assistant_limit integer DEFAULT 2,
    branch_limit integer DEFAULT 3,
    allow_employee_submissions boolean DEFAULT false,
    hide_employee_investor_funds boolean DEFAULT false,
    allow_employee_loan_edits boolean DEFAULT false,
    permissions jsonb,
    last_status_change timestamp with time zone,
    trial_ends_at timestamp with time zone,
    default_trial_period_days integer,
    CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create other tables
CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    manager_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    name character varying NOT NULL,
    city character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.investors (
    id uuid NOT NULL PRIMARY KEY,
    name character varying,
    date timestamp with time zone DEFAULT now(),
    status public.user_status DEFAULT 'معلق'::public.user_status,
    submitted_by uuid,
    rejection_reason text,
    is_notified boolean DEFAULT false,
    installment_profit_share double precision,
    grace_period_profit_share double precision,
    CONSTRAINT investors_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.borrowers (
    id text NOT NULL PRIMARY KEY,
    name character varying,
    national_id character varying,
    phone character varying,
    amount double precision,
    rate double precision,
    term integer,
    date timestamp with time zone DEFAULT now(),
    loan_type public.loan_type,
    status public.loan_status,
    due_date date,
    discount double precision,
    submitted_by uuid,
    rejection_reason text,
    funded_by jsonb,
    payment_status public.borrower_payment_status,
    installments jsonb,
    is_notified boolean,
    last_status_change timestamp with time zone,
    paid_off_date timestamp with time zone,
    partial_payment jsonb,
    original_loan_id text
);

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    investor_id uuid REFERENCES public.investors(id),
    date timestamp with time zone DEFAULT now(),
    type public.transaction_type,
    amount double precision,
    description text,
    withdrawal_method public.withdrawal_method,
    capital_source public.capital_source
);

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    date timestamp with time zone DEFAULT now(),
    recipient_id uuid REFERENCES public.users(id),
    title text,
    description text,
    is_read boolean DEFAULT false
);

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    date timestamp with time zone DEFAULT now(),
    from_user_id uuid,
    from_user_name character varying,
    from_user_email character varying,
    subject text,
    message text,
    is_read boolean DEFAULT false,
    is_replied boolean DEFAULT false
);

CREATE TABLE public.app_config (
    key text NOT NULL PRIMARY KEY,
    value jsonb
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role_from_meta public.user_role;
    trial_days integer;
BEGIN
    user_role_from_meta := (new.raw_user_meta_data->>'user_role')::public.user_role;

    INSERT INTO public.users (id, name, email, phone, role, office_name, managed_by, status, trial_ends_at)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.email,
        new.raw_user_meta_data->>'raw_phone_number',
        user_role_from_meta,
        new.raw_user_meta_data->>'office_name',
        (new.raw_user_meta_data->>'managedBy')::uuid,
        CASE
            WHEN user_role_from_meta = 'مدير المكتب' THEN 'معلق'::public.user_status
            ELSE 'نشط'::public.user_status
        END
    );

    -- Set trial period only for new Office Managers
    IF user_role_from_meta = 'مدير المكتب' THEN
        SELECT (value->>'value')::integer INTO trial_days FROM public.app_config WHERE key = 'defaultTrialPeriodDays';
        UPDATE public.users
        SET trial_ends_at = now() + (COALESCE(trial_days, 14) * interval '1 day')
        WHERE id = new.id;
    END IF;

    RETURN new;
END;
$$;

-- Trigger to call the function on new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all access for system admins" ON public.users FOR ALL TO authenticated USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام' );
CREATE POLICY "Allow manager to see their team and self" ON public.users FOR SELECT TO authenticated USING ( id = auth.uid() OR managed_by = auth.uid() OR managed_by = (SELECT managed_by FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Allow user to see their own data" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Allow all access for system admins on investors" ON public.investors FOR ALL TO authenticated USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام' );
CREATE POLICY "Allow team members to see their office investors" ON public.investors FOR SELECT TO authenticated USING ( id IN (SELECT id FROM public.users WHERE managed_by = (SELECT COALESCE(managed_by, id) FROM public.users WHERE id = auth.uid())) );
CREATE POLICY "Allow investor to see their own data" ON public.investors FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Allow all access for system admins on borrowers" ON public.borrowers FOR ALL TO authenticated USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام' );
CREATE POLICY "Allow team members to manage their submitted borrowers" ON public.borrowers FOR ALL TO authenticated USING ( submitted_by IN (SELECT id FROM public.users WHERE managed_by = (SELECT COALESCE(managed_by, id) FROM public.users WHERE id = auth.uid()) OR id = (SELECT COALESCE(managed_by, id) FROM public.users WHERE id = auth.uid())) );

-- Add other policies for other tables as needed...
CREATE POLICY "Allow user to read their own notifications" ON public.notifications FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "Allow admin to manage all support tickets" ON public.support_tickets FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');
CREATE POLICY "Allow user to create support tickets" ON public.support_tickets FOR INSERT WITH CHECK (from_user_id = auth.uid());


-- Function to get all relevant data for a user
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
    user_role_val public.user_role;
    manager_id_val uuid;
BEGIN
    SELECT role, managed_by INTO user_role_val, manager_id_val FROM public.users WHERE id = user_id_param;

    IF user_role_val = 'مدير النظام' THEN
        manager_id_val := NULL; -- Admin sees all
    ELSIF user_role_val = 'مدير المكتب' THEN
        manager_id_val := user_id_param;
    END IF; -- For other roles, manager_id_val is already set from the query

    RETURN QUERY
    WITH relevant_users AS (
        SELECT id FROM public.users u
        WHERE user_role_val = 'مدير النظام'
           OR u.id = user_id_param
           OR u.managed_by = manager_id_val
           OR (user_role_val = 'مستثمر' AND u.id = user_id_param)
           OR u.id = manager_id_val
    ),
    relevant_investors AS (
        SELECT i.id FROM public.investors i
        JOIN public.users u ON i.id = u.id
        WHERE user_role_val = 'مدير النظام' OR u.managed_by = manager_id_val
    )
    SELECT
        (SELECT json_agg(u) FROM public.users u WHERE u.id IN (SELECT id FROM relevant_users) OR user_role_val = 'مدير النظام'),
        (SELECT json_agg(i) FROM public.investors i WHERE i.id IN (SELECT id FROM relevant_investors) OR (user_role_val = 'مستثمر' AND i.id = user_id_param) OR user_role_val = 'مدير النظام'),
        (SELECT json_agg(b) FROM public.borrowers b WHERE b.submitted_by IN (SELECT id FROM relevant_users) OR (b.funded_by::jsonb @> jsonb_build_array(jsonb_build_object('investorId', user_id_param::text))) OR user_role_val = 'مدير النظام'),
        (SELECT json_agg(t) FROM public.transactions t WHERE t.investor_id IN (SELECT id FROM relevant_investors) OR (user_role_val = 'مستثمر' AND t.investor_id = user_id_param) OR user_role_val = 'مدير النظام'),
        (SELECT json_agg(n) FROM public.notifications n WHERE n.recipient_id = user_id_param),
        (SELECT json_agg(st) FROM public.support_tickets st WHERE user_role_val = 'مدير النظام' OR st.from_user_id = user_id_param),
        (SELECT json_agg(ac) FROM public.app_config ac),
        (SELECT json_agg(br) FROM public.branches br WHERE br.manager_id = manager_id_val OR user_role_val = 'مدير النظام');
END;
$$;


-- Seed initial app config data
INSERT INTO public.app_config (key, value) VALUES
('defaultTrialPeriodDays', '{"value": 14}'),
('baseInterestRate', '{"value": 15}'),
('investorSharePercentage', '{"value": 70}'),
('salaryRepaymentPercentage', '{"value": 33.3}'),
('graceTotalProfitPercentage', '{"value": 10}'),
('graceInvestorSharePercentage', '{"value": 50}'),
('supportEmail', '{"value": "support@example.com"}'),
('supportPhone', '{"value": "920000000"}')
ON CONFLICT (key) DO NOTHING;
