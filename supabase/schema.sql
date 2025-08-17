-- Drop everything in the correct order to avoid dependency errors
DROP TABLE IF EXISTS "public"."transactions" CASCADE;
DROP TABLE IF EXISTS "public"."borrowers" CASCADE;
DROP TABLE IF EXISTS "public"."investors" CASCADE;
DROP TABLE IF EXISTS "public"."branches" CASCADE;
DROP TABLE IF EXISTS "public"."users" CASCADE;
DROP TABLE IF EXISTS "public"."app_config" CASCADE;
DROP TABLE IF EXISTS "public"."notifications" CASCADE;
DROP TABLE IF EXISTS "public"."support_tickets" CASCADE;

DROP FUNCTION IF EXISTS "public"."handle_new_user"() CASCADE;
DROP FUNCTION IF EXISTS "public"."get_my_claim"(text) CASCADE;
DROP FUNCTION IF EXISTS "public"."get_my_claims"() CASCADE;

DROP TYPE IF EXISTS "public"."user_role" CASCADE;
DROP TYPE IF EXISTS "public"."borrower_status" CASCADE;
DROP TYPE IF EXISTS "public"."borrower_payment_status" CASCADE;
DROP TYPE IF EXISTS "public"."investor_status" CASCADE;
DROP TYPE IF EXISTS "public"."loan_type" CASCADE;
DROP TYPE IF EXISTS "public"."transaction_type" CASCADE;
DROP TYPE IF EXISTS "public"."withdrawal_method" CASCADE;
DROP TYPE IF EXISTS "public"."installment_status" CASCADE;


-- Create custom types
CREATE TYPE "public"."user_role" AS ENUM ('مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر');
CREATE TYPE "public"."borrower_status" AS ENUM ('منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض');
CREATE TYPE "public"."borrower_payment_status" AS ENUM ('منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد');
CREATE TYPE "public"."investor_status" AS ENUM ('نشط', 'غير نشط', 'معلق', 'مرفوض', 'محذوف');
CREATE TYPE "public"."loan_type" AS ENUM ('اقساط', 'مهلة');
CREATE TYPE "public"."transaction_type" AS ENUM ('إيداع رأس المال', 'سحب من رأس المال');
CREATE TYPE "public"."withdrawal_method" AS ENUM ('نقدي', 'بنكي');
CREATE TYPE "public"."installment_status" AS ENUM ('لم يسدد بعد', 'تم السداد', 'متأخر');

-- Create users table
CREATE TABLE "public"."users" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "office_name" "text",
    "email" "text" NOT NULL,
    "phone" "text",
    "role" "public"."user_role" NOT NULL,
    "status" "public"."investor_status" NOT NULL DEFAULT 'معلق'::public.investor_status,
    "registrationDate" timestamp with time zone DEFAULT "now"() NOT NULL,
    "managedBy" "uuid",
    "trialEndsAt" timestamp with time zone,
    "defaultTrialPeriodDays" integer,
    "investorLimit" integer DEFAULT 10,
    "employeeLimit" integer DEFAULT 5,
    "assistantLimit" integer DEFAULT 2,
    "branchLimit" integer DEFAULT 3,
    "allowEmployeeSubmissions" boolean DEFAULT false,
    "hideEmployeeInvestorFunds" boolean DEFAULT false,
    "allowEmployeeLoanEdits" boolean DEFAULT false,
    "permissions" "jsonb"
);
ALTER TABLE "public"."users" OWNER TO "postgres";
ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE "public"."users"
    ADD CONSTRAINT "users_managedBy_fkey" FOREIGN KEY ("managedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Create branches table
CREATE TABLE "public"."branches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."branches" OWNER TO "postgres";
ALTER TABLE ONLY "public"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."branches"
    ADD CONSTRAINT "branches_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- Create investors table
CREATE TABLE "public"."investors" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."investor_status" NOT NULL,
    "submittedBy" "uuid",
    "rejectionReason" "text",
    "isNotified" boolean DEFAULT false NOT NULL,
    "installmentProfitShare" real,
    "gracePeriodProfitShare" real
);
ALTER TABLE "public"."investors" OWNER TO "postgres";
ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."investors"
    ADD CONSTRAINT "investors_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE CASCADE;
ALTER TABLE "public"."investors"
    ADD CONSTRAINT "investors_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Create borrowers table
CREATE TABLE "public"."borrowers" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "nationalId" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "amount" real NOT NULL,
    "rate" real,
    "term" real,
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "loanType" "public"."loan_type" NOT NULL,
    "status" "public"."borrower_status" NOT NULL,
    "dueDate" "date" NOT NULL,
    "discount" real,
    "submittedBy" "uuid",
    "rejectionReason" "text",
    "fundedBy" "jsonb",
    "paymentStatus" "public"."borrower_payment_status",
    "installments" "jsonb",
    "isNotified" boolean DEFAULT false NOT NULL,
    "lastStatusChange" timestamp with time zone,
    "paidOffDate" timestamp with time zone,
    "partial_payment_paid_amount" real,
    "partial_payment_remaining_loan_id" "text",
    "originalLoanId" "text"
);
ALTER TABLE "public"."borrowers" OWNER TO "postgres";
ALTER TABLE ONLY "public"."borrowers"
    ADD CONSTRAINT "borrowers_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."borrowers"
    ADD CONSTRAINT "borrowers_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL;

-- Create transactions table
CREATE TABLE "public"."transactions" (
    "id" "text" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "amount" real NOT NULL,
    "description" "text",
    "withdrawalMethod" "public"."withdrawal_method",
    "capitalSource" "text" NOT NULL
);
ALTER TABLE "public"."transactions" OWNER TO "postgres";
ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."transactions"
    ADD CONSTRAINT "transactions_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE CASCADE;

-- Create app_config table
CREATE TABLE "public"."app_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);
ALTER TABLE "public"."app_config" OWNER TO "postgres";
ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");

-- Create notifications table
CREATE TABLE "public"."notifications" (
    "id" "text" NOT NULL,
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipientId" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "isRead" boolean DEFAULT false
);
ALTER TABLE "public"."notifications" OWNER TO "postgres";
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."notifications"
    ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- Create support_tickets table
CREATE TABLE "public"."support_tickets" (
    "id" "text" NOT NULL,
    "date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fromUserId" "uuid" NOT NULL,
    "fromUserName" "text" NOT NULL,
    "fromUserEmail" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "isRead" boolean DEFAULT false,
    "isReplied" boolean DEFAULT false
);
ALTER TABLE "public"."support_tickets" OWNER TO "postgres";
ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");
ALTER TABLE "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- TRIGGER FUNCTION to create a user profile when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_role public.user_role;
  managed_by_id uuid;
  trial_period_days int;
  trial_end_date timestamp with time zone;
begin
  -- Extract user role from user_metadata, default to 'مستثمر' if not present
  user_role := (new.raw_user_meta_data ->> 'user_role')::public.user_role;
  managed_by_id := (new.raw_user_meta_data ->> 'managedBy')::uuid;

  -- Set trial period only for Office Managers
  if user_role = 'مدير المكتب' then
    select (value ->> 'value')::int into trial_period_days from public.app_config where key = 'defaultTrialPeriodDays' limit 1;
    if trial_period_days is null then
      trial_period_days := 14; -- Default fallback
    end if;
    trial_end_date := now() + (trial_period_days * interval '1 day');
  else
    trial_end_date := null;
  end if;

  insert into public.users (id, name, office_name, email, phone, role, managedBy, trialEndsAt)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'office_name',
    new.email,
    new.raw_user_meta_data ->> 'raw_phone_number',
    user_role,
    managed_by_id,
    trial_end_date
  );
  return new;
end;
$$;

-- ATTACH TRIGGER to auth.users table
CREATE TRIGGER on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- POLICIES
-- USERS TABLE
CREATE POLICY "Allow users to read their own data" ON "public"."users"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow managers to read their team data" ON "public"."users"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (id IN ( SELECT users.id FROM users WHERE users."managedBy" = auth.uid() ));

CREATE POLICY "Allow team members to read their manager data" ON "public"."users"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (id IN ( SELECT users."managedBy" FROM users WHERE users.id = auth.uid() ));

CREATE POLICY "Allow admin to read all users" ON "public"."users"
AS PERMISSIVE FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'user_role') = 'مدير النظام');

CREATE POLICY "Allow users to update their own data" ON "public"."users"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- INVESTORS TABLE
CREATE POLICY "Allow investors to read their own data" ON "public"."investors"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow managers to read their investors" ON "public"."investors"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'user_role') IN ('مدير المكتب', 'مساعد مدير المكتب', 'موظف')
  AND "submittedBy" IN (
    SELECT id FROM users WHERE "managedBy" = (SELECT "managedBy" FROM users WHERE id = auth.uid())
    UNION
    SELECT (SELECT "managedBy" FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Allow admin to read all investors" ON "public"."investors"
AS PERMISSIVE FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'user_role') = 'مدير النظام');

-- BORROWERS TABLE
CREATE POLICY "Allow managers to read team borrowers" ON "public"."borrowers"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'user_role') IN ('مدير المكتب', 'مساعد مدير المكتب', 'موظف')
  AND "submittedBy" IN (
    SELECT id FROM users WHERE "managedBy" = (SELECT "managedBy" FROM users WHERE id = auth.uid()) OR id = (SELECT "managedBy" FROM users WHERE id = auth.uid())
    UNION
    SELECT auth.uid()
  )
);

CREATE POLICY "Allow investors to read their funded loans" ON "public"."borrowers"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  ((auth.jwt() -> 'user_metadata' ->> 'user_role') = 'مستثمر') AND
  ("fundedBy" @> jsonb_build_array(jsonb_build_object('investorId', auth.uid()::text)))
);


CREATE POLICY "Allow admin to read all borrowers" ON "public"."borrowers"
AS PERMISSIVE FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'user_role') = 'مدير النظام');

-- OTHER TABLES (simple policies)
CREATE POLICY "Allow auth users to read all app_config" ON "public"."app_config"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to see their own notifications" ON "public"."notifications"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = "recipientId");

CREATE POLICY "Allow admin to see all support tickets" ON "public"."support_tickets"
AS PERMISSIVE FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'user_role') = 'مدير النظام');

CREATE POLICY "Allow users to see their own submitted tickets" ON "public"."support_tickets"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = "fromUserId");

CREATE POLICY "Allow investors to see their transactions" ON "public"."transactions"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.uid() = investor_id);

CREATE POLICY "Allow managers to see their investors transactions" ON "public"."transactions"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'user_role') IN ('مدير المكتب', 'مساعد مدير المكتب')
  AND investor_id IN (
    SELECT id FROM investors WHERE "submittedBy" IN (
      SELECT id FROM users WHERE "managedBy" = (SELECT "managedBy" FROM users WHERE id = auth.uid())
      UNION
      SELECT (SELECT "managedBy" FROM users WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "Allow admin to read all transactions" ON "public"."transactions"
AS PERMISSIVE FOR SELECT
TO authenticated
USING ((auth.jwt() -> 'user_metadata' ->> 'user_role') = 'مدير النظام');

CREATE POLICY "Allow managers to read branches" ON "public"."branches"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'user_role') IN ('مدير المكتب', 'مساعد مدير المكتب', 'موظف')
);

CREATE POLICY "Allow admin to read all branches" ON "public"."branches"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'user_role') = 'مدير النظام'
);


-- INSERT Initial App Config Data
INSERT INTO public.app_config (key, value) VALUES
    ('defaultTrialPeriodDays', '{"value": 14}'),
    ('baseInterestRate', '{"value": 15}'),
    ('investorSharePercentage', '{"value": 70}'),
    ('salaryRepaymentPercentage', '{"value": 60}'),
    ('graceTotalProfitPercentage', '{"value": 25}'),
    ('graceInvestorSharePercentage', '{"value": 33.3}'),
    ('supportEmail', '{"value": "qzmpty678@gmail.com"}'),
    ('supportPhone', '{"value": "0598360380"}')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;
    