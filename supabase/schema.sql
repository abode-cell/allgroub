-- Drop existing objects in the correct order to avoid dependency errors
DROP TABLE IF EXISTS "public"."transactions" CASCADE;
DROP TABLE IF EXISTS "public"."borrowers" CASCADE;
DROP TABLE IF EXISTS "public"."investors" CASCADE;
DROP TABLE IF EXISTS "public"."branches" CASCADE;
DROP TABLE IF EXISTS "public"."support_tickets" CASCADE;
DROP TABLE IF EXISTS "public"."notifications" CASCADE;
DROP TABLE IF EXISTS "public"."users" CASCADE;
DROP TABLE IF EXISTS "public"."app_config" CASCADE;

DROP FUNCTION IF EXISTS "public"."handle_new_user"() CASCADE;
DROP FUNCTION IF EXISTS "public"."get_my_claim"(text) CASCADE;
DROP FUNCTION IF EXISTS "public"."get_my_claims"() CASCADE;

DROP TYPE IF EXISTS "public"."user_role" CASCADE;
DROP TYPE IF EXISTS "public"."borrower_status" CASCADE;
DROP TYPE IF EXISTS "public"."investor_status" CASCADE;
DROP TYPE IF EXISTS "public"."loan_type" CASCADE;
DROP TYPE IF EXISTS "public"."transaction_type" CASCADE;
DROP TYPE IF EXISTS "public"."withdrawal_method" CASCADE;
DROP TYPE IF EXISTS "public"."installment_status" CASCADE;
DROP TYPE IF EXISTS "public"."borrower_payment_status" CASCADE;

-- Re-create ENUM types
CREATE TYPE "public"."user_role" AS ENUM ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');
CREATE TYPE "public"."investor_status" AS ENUM ('نشط', 'غير نشط', 'معلق', 'مرفوض', 'محذوف');
CREATE TYPE "public"."borrower_status" AS ENUM ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');
CREATE TYPE "public"."borrower_payment_status" AS ENUM ('منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد');
CREATE TYPE "public"."loan_type" AS ENUM ('اقساط', 'مهلة');
CREATE TYPE "public"."transaction_type" AS ENUM ('إيداع رأس المال', 'سحب من رأس المال');
CREATE TYPE "public"."withdrawal_method" AS ENUM ('نقدي', 'بنكي');
CREATE TYPE "public"."installment_status" AS ENUM ('لم يسدد بعد', 'تم السداد', 'متأخر');

-- Create users table with improved defaults and structure
CREATE TABLE "public"."users" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "office_name" "text",
    "email" "text" NOT NULL,
    "phone" "text",
    "role" "public"."user_role" NOT NULL,
    "status" "public"."investor_status" NOT NULL DEFAULT 'معلق',
    "registrationDate" timestamp with time zone NOT NULL DEFAULT "now"(),
    "managedBy" "uuid",
    "trialEndsAt" timestamp with time zone,
    "defaultTrialPeriodDays" integer,
    "investorLimit" integer NOT NULL DEFAULT 10,
    "employeeLimit" integer NOT NULL DEFAULT 5,
    "assistantLimit" integer NOT NULL DEFAULT 2,
    "branchLimit" integer NOT NULL DEFAULT 3,
    "allowEmployeeSubmissions" boolean NOT NULL DEFAULT false,
    "hideEmployeeInvestorFunds" boolean NOT NULL DEFAULT false,
    "allowEmployeeLoanEdits" boolean NOT NULL DEFAULT false,
    "permissions" "jsonb"
);
ALTER TABLE "public"."users" OWNER TO "postgres";
ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."users" ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_managedBy_fkey" FOREIGN KEY ("managedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Create handle_new_user function (New & Improved)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET SEARCH_PATH = public
AS $$
DECLARE
  user_role public.user_role;
  managed_by_id uuid;
  trial_period_days int;
  trial_end_date timestamp with time zone;
  user_name text;
  user_office_name text;
  user_phone text;
BEGIN
  -- Extract user role from user_metadata. It's critical this is passed.
  -- This is the most reliable way to get metadata at insertion.
  user_role := (new.raw_user_meta_data ->> 'user_role')::public.user_role;
  user_name := new.raw_user_meta_data ->> 'full_name';
  user_office_name := new.raw_user_meta_data ->> 'office_name';
  user_phone := new.raw_user_meta_data ->> 'raw_phone_number';
  managed_by_id := (new.raw_user_meta_data ->> 'managedBy')::uuid;

  -- If the role is missing, we cannot proceed.
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'user_role is required in user_metadata';
  END IF;

  -- Set trial period only for Office Managers
  IF user_role = 'مدير المكتب' THEN
    SELECT (value ->> 'value')::int INTO trial_period_days FROM public.app_config WHERE key = 'defaultTrialPeriodDays' LIMIT 1;
    IF trial_period_days IS NULL THEN
      trial_period_days := 14; -- Default fallback
    END IF;
    trial_end_date := now() + (trial_period_days * interval '1 day');
  ELSE
    trial_end_date := null;
  END IF;

  INSERT INTO public.users (id, name, office_name, email, phone, role, managedBy, trialEndsAt, status)
  VALUES (
    new.id,
    COALESCE(user_name, 'New User'),
    user_office_name,
    new.email,
    user_phone,
    user_role,
    managed_by_id,
    trial_end_date,
    'معلق' -- All new users start as pending
  );
  
  RETURN new;
END;
$$;

-- Create trigger for new user
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create other tables...
CREATE TABLE "public"."branches" (
    "id" "uuid" NOT NULL DEFAULT "extensions"."uuid_generate_v4"(),
    "manager_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT "now"()
);
ALTER TABLE "public"."branches" OWNER TO "postgres";
ALTER TABLE ONLY "public"."branches" ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."branches" ADD CONSTRAINT "branches_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

CREATE TABLE "public"."investors" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "date" timestamp with time zone NOT NULL DEFAULT "now"(),
    "status" "public"."investor_status" NOT NULL,
    "submittedBy" "uuid",
    "rejectionReason" "text",
    "isNotified" boolean NOT NULL DEFAULT false,
    "installmentProfitShare" real,
    "gracePeriodProfitShare" real
);
ALTER TABLE "public"."investors" OWNER TO "postgres";
ALTER TABLE ONLY "public"."investors" ADD CONSTRAINT "investors_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."investors" ADD CONSTRAINT "investors_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE "public"."investors" ADD CONSTRAINT "investors_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL;

CREATE TABLE "public"."borrowers" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "nationalId" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "amount" real NOT NULL,
    "rate" real,
    "term" real,
    "date" timestamp with time zone NOT NULL DEFAULT "now"(),
    "loanType" "public"."loan_type" NOT NULL,
    "status" "public"."borrower_status" NOT NULL,
    "dueDate" "date" NOT NULL,
    "discount" real,
    "submittedBy" "uuid",
    "rejectionReason" "text",
    "fundedBy" "jsonb",
    "paymentStatus" "public"."borrower_payment_status",
    "installments" "jsonb",
    "isNotified" boolean NOT NULL DEFAULT false,
    "lastStatusChange" timestamp with time zone,
    "paidOffDate" timestamp with time zone,
    "partial_payment_paid_amount" real,
    "partial_payment_remaining_loan_id" "text",
    "originalLoanId" "text"
);
ALTER TABLE "public"."borrowers" OWNER TO "postgres";
ALTER TABLE ONLY "public"."borrowers" ADD CONSTRAINT "borrowers_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."borrowers" ADD CONSTRAINT "borrowers_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL;

CREATE TABLE "public"."transactions" (
    "id" "text" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "date" timestamp with time zone NOT NULL DEFAULT "now"(),
    "type" "public"."transaction_type" NOT NULL,
    "amount" real NOT NULL,
    "description" "text",
    "withdrawalMethod" "public"."withdrawal_method",
    "capitalSource" "text" NOT NULL
);
ALTER TABLE "public"."transactions" OWNER TO "postgres";
ALTER TABLE ONLY "public"."transactions" ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE CASCADE;

CREATE TABLE "public"."notifications" (
    "id" "uuid" NOT NULL DEFAULT "extensions"."uuid_generate_v4"(),
    "date" timestamp with time zone NOT NULL DEFAULT "now"(),
    "recipientId" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "isRead" boolean NOT NULL DEFAULT false
);
ALTER TABLE "public"."notifications" OWNER TO "postgres";
ALTER TABLE ONLY "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

CREATE TABLE "public"."support_tickets" (
    "id" "uuid" NOT NULL DEFAULT "extensions"."uuid_generate_v4"(),
    "date" timestamp with time zone NOT NULL DEFAULT "now"(),
    "fromUserId" "uuid" NOT NULL,
    "fromUserName" "text" NOT NULL,
    "fromUserEmail" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "isRead" boolean NOT NULL DEFAULT false,
    "isReplied" boolean NOT NULL DEFAULT false
);
ALTER TABLE "public"."support_tickets" OWNER TO "postgres";
ALTER TABLE ONLY "public"."support_tickets" ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

CREATE TABLE "public"."app_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);
ALTER TABLE "public"."app_config" OWNER TO "postgres";
ALTER TABLE ONLY "public"."app_config" ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- POLICIES (Simplified and more robust)
CREATE POLICY "Allow users to read their own data" ON "public"."users" FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Allow system admin to access all users" ON "public"."users" FOR ALL TO authenticated USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام') WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');
CREATE POLICY "Allow managers to read their team data" ON "public"."users" FOR SELECT TO authenticated USING (managedBy = auth.uid());
CREATE POLICY "Allow team members to read their manager's data" ON "public"."users" FOR SELECT TO authenticated USING (id = (SELECT managedBy FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Allow users to update their own basic info" ON "public"."users" FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Investors Policies
CREATE POLICY "Investors can see their own profile" ON public.investors FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Team members can see investors of their manager" ON public.investors FOR SELECT TO authenticated USING ("submittedBy" IN (SELECT id FROM users WHERE "managedBy" = (SELECT "managedBy" FROM users WHERE id = auth.uid()) OR id = (SELECT "managedBy" FROM users WHERE id = auth.uid())));
CREATE POLICY "Admin can see all investors" ON public.investors FOR SELECT TO authenticated USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');

-- Borrowers Policies
CREATE POLICY "Team can see their submitted borrowers" ON public.borrowers FOR SELECT TO authenticated USING ("submittedBy" IN (SELECT id FROM users WHERE "managedBy" = (SELECT "managedBy" FROM users WHERE id = auth.uid()) OR id = (SELECT "managedBy" FROM users WHERE id = auth.uid()) OR id = auth.uid()));
CREATE POLICY "Investors can see their funded borrowers" ON public.borrowers FOR SELECT TO authenticated USING ((fundedBy::jsonb) @> (jsonb_build_array(jsonb_build_object('investorId', auth.uid()::text))));
CREATE POLICY "Admin can see all borrowers" ON public.borrowers FOR SELECT TO authenticated USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');

-- Transactions Policies
CREATE POLICY "Investors can see their own transactions" ON public.transactions FOR SELECT TO authenticated USING (investor_id = auth.uid());
CREATE POLICY "Managers can see transactions of their investors" ON public.transactions FOR SELECT TO authenticated USING (investor_id IN (SELECT id FROM public.investors WHERE "submittedBy" IN (SELECT id FROM users WHERE "managedBy" = (SELECT "managedBy" FROM users WHERE id = auth.uid()) OR id = (SELECT "managedBy" FROM users WHERE id = auth.uid()))));
CREATE POLICY "Admin can see all transactions" ON public.transactions FOR SELECT TO authenticated USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');

-- Branches Policies
CREATE POLICY "Manager can see their own branches" ON public.branches FOR SELECT TO authenticated USING (manager_id = auth.uid());
CREATE POLICY "Team members can see branches of their office" ON public.branches FOR SELECT TO authenticated USING (manager_id = (SELECT "managedBy" from public.users where id = auth.uid()));
CREATE POLICY "Admin can see all branches" ON public.branches FOR SELECT TO authenticated USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');

-- Simple Policies for other tables
CREATE POLICY "Allow authenticated users to read config" ON "public"."app_config" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow user to see their own notifications" ON "public"."notifications" FOR SELECT TO authenticated USING ("recipientId" = auth.uid());
CREATE POLICY "Allow admin to see all support tickets" ON "public"."support_tickets" FOR SELECT TO authenticated USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'مدير النظام');
CREATE POLICY "Allow users to see their own submitted tickets" ON "public"."support_tickets" FOR SELECT TO authenticated USING ("fromUserId" = auth.uid());


-- Insert/Update initial app config data
INSERT INTO public.app_config (key, value) VALUES
    ('defaultTrialPeriodDays', '{"value": 14}'),
    ('baseInterestRate', '{"value": 15}'),
    ('investorSharePercentage', '{"value": 70}'),
    ('salaryRepaymentPercentage', '{"value": 60}'),
    ('graceTotalProfitPercentage', '{"value": 25}'),
    ('graceInvestorSharePercentage', '{"value": 33.3}'),
    ('supportEmail', '{"value": "qzmpty678@gmail.com"}'),
    ('supportPhone', '{"value": "0598360380"}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
