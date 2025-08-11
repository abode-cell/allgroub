-- =================================================================
-- Professional Supabase Setup Script for "Aal Platform"
-- Version: 1.0
-- Description: This script sets up the entire database schema,
--              including tables, types, relationships,
--              Row Level Security (RLS) policies, and initial data.
-- =================================================================

-- Drop existing tables in reverse order of creation to avoid foreign key constraints issues
-- This is useful for resetting the database during development
DROP TABLE IF EXISTS "public"."borrower_funders" CASCADE;
DROP TABLE IF EXISTS "public"."borrower_installments" CASCADE;
DROP TABLE IF EXISTS "public"."transactions" CASCADE;
DROP TABLE IF EXISTS "public"."notifications" CASCADE;
DROP TABLE IF EXISTS "public"."support_tickets" CASCADE;
DROP TABLE IF EXISTS "public"."app_config" CASCADE;
DROP TABLE IF EXISTS "public"."borrowers" CASCADE;
DROP TABLE IF EXISTS "public"."investors" CASCADE;
DROP TABLE IF EXISTS "public"."branches" CASCADE;
DROP TABLE IF EXISTS "public"."users" CASCADE;


-- Drop custom types if they exist
DROP TYPE IF EXISTS "public"."user_role" CASCADE;
DROP TYPE IF EXISTS "public"."user_status" CASCADE;
DROP TYPE IF EXISTS "public"."loan_type" CASCADE;
DROP TYPE IF EXISTS "public"."loan_status" CASCADE;
DROP TYPE IF EXISTS "public"."payment_status" CASCADE;
DROP TYPE IF EXISTS "public"."installment_status" CASCADE;
DROP TYPE IF EXISTS "public"."transaction_type" CASCADE;
DROP TYPE IF EXISTS "public"."withdrawal_method" CASCADE;
DROP TYPE IF EXISTS "public"."capital_source" CASCADE;


-- =================================================================
-- 1. Create Custom Types
-- =================================================================
CREATE TYPE "public"."user_role" AS ENUM (
  'مدير النظام', 'مدير المكتب', 'مساعد مدير المكتب', 'موظف', 'مستثمر'
);

CREATE TYPE "public"."user_status" AS ENUM (
  'نشط', 'معلق', 'مرفوض', 'محذوف'
);

CREATE TYPE "public"."loan_type" AS ENUM (
  'اقساط', 'مهلة'
);

CREATE TYPE "public"."loan_status" AS ENUM (
  'منتظم', 'متأخر', 'مسدد بالكامل', 'متعثر', 'معلق', 'مرفوض'
);

CREATE TYPE "public"."payment_status" AS ENUM (
  'منتظم', 'متأخر بقسط', 'متأخر بقسطين', 'متعثر', 'تم اتخاذ الاجراءات القانونيه', 'مسدد جزئي', 'تم الإمهال', 'تم السداد'
);

CREATE TYPE "public"."installment_status" AS ENUM (
  'لم يسدد بعد', 'تم السداد', 'متأخر'
);

CREATE TYPE "public"."transaction_type" AS ENUM (
  'إيداع رأس المال', 'سحب من رأس المال'
);

CREATE TYPE "public"."withdrawal_method" AS ENUM (
  'نقدي', 'بنكي'
);

CREATE TYPE "public"."capital_source" AS ENUM (
    'installment', 'grace'
);

-- =================================================================
-- 2. Create Tables
-- =================================================================

-- Users Table
CREATE TABLE "public"."users" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
  "name" "text" NOT NULL,
  "officeName" "text",
  "email" "text" NOT NULL UNIQUE,
  "phone" "text" UNIQUE,
  "role" "public"."user_role" NOT NULL,
  "status" "public"."user_status" NOT NULL,
  "photoURL" "text",
  "password" "text", -- Note: In production, this should be a hashed password.
  "managedBy" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "registrationDate" "timestamptz" DEFAULT "now"(),
  "trialEndsAt" "timestamptz",
  "defaultTrialPeriodDays" "int4",
  "investorLimit" "int4",
  "employeeLimit" "int4",
  "assistantLimit" "int4",
  "branchLimit" "int4",
  "allowEmployeeSubmissions" "bool",
  "hideEmployeeInvestorFunds" "bool",
  "allowEmployeeLoanEdits" "bool",
  "permissions" "jsonb",
  "lastStatusChange" "timestamptz"
);
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Branches Table
CREATE TABLE "public"."branches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL
);
ALTER TABLE "public"."branches" ENABLE ROW LEVEL SECURITY;

-- Investors Table
CREATE TABLE "public"."investors" (
    "id" "uuid" NOT NULL PRIMARY KEY REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "name" "text" NOT NULL, -- Duplicated for easier access, but linked to users.id
    "date" "timestamptz" DEFAULT now() NOT NULL,
    "status" "public"."user_status" NOT NULL,
    "submitted_by" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "rejection_reason" "text",
    "is_notified" "bool" DEFAULT false,
    "installment_profit_share" "numeric",
    "grace_period_profit_share" "numeric"
);
ALTER TABLE "public"."investors" ENABLE ROW LEVEL SECURITY;

-- Borrowers Table
CREATE TABLE "public"."borrowers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "name" "text" NOT NULL,
    "nationalId" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "amount" "numeric" NOT NULL,
    "rate" "numeric",
    "term" "int4",
    "date" "timestamptz" DEFAULT now() NOT NULL,
    "loanType" "public"."loan_type" NOT NULL,
    "status" "public"."loan_status" NOT NULL,
    "dueDate" "date",
    "discount" "numeric",
    "submittedBy" "uuid" REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "rejectionReason" "text",
    "paymentStatus" "public"."payment_status",
    "isNotified" "bool" DEFAULT false,
    "lastStatusChange" "timestamptz",
    "paidOffDate" "timestamptz",
    "partial_payment_paid_amount" "numeric",
    "partial_payment_remaining_loan_id" "uuid",
    "originalLoanId" "uuid"
);
ALTER TABLE "public"."borrowers" ENABLE ROW LEVEL SECURITY;

-- Borrower Funders (Junction Table)
CREATE TABLE "public"."borrower_funders" (
    "borrower_id" "uuid" NOT NULL REFERENCES "public"."borrowers"("id") ON DELETE CASCADE,
    "investor_id" "uuid" NOT NULL REFERENCES "public"."investors"("id") ON DELETE CASCADE,
    "amount" "numeric" NOT NULL,
    PRIMARY KEY ("borrower_id", "investor_id")
);
ALTER TABLE "public"."borrower_funders" ENABLE ROW LEVEL SECURITY;

-- Borrower Installments
CREATE TABLE "public"."borrower_installments" (
    "borrower_id" "uuid" NOT NULL REFERENCES "public"."borrowers"("id") ON DELETE CASCADE,
    "month" "int4" NOT NULL,
    "status" "public"."installment_status" NOT NULL,
    PRIMARY KEY ("borrower_id", "month")
);
ALTER TABLE "public"."borrower_installments" ENABLE ROW LEVEL SECURITY;


-- Transactions Table
CREATE TABLE "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "investor_id" "uuid" NOT NULL REFERENCES "public"."investors"("id") ON DELETE CASCADE,
    "date" "timestamptz" NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "amount" "numeric" NOT NULL,
    "description" "text",
    "withdrawalMethod" "public"."withdrawal_method",
    "capitalSource" "public"."capital_source"
);
ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


-- Notifications Table
CREATE TABLE "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "recipient_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "title" "text" NOT NULL,
    "description" "text",
    "is_read" "bool" DEFAULT false,
    "date" "timestamptz" DEFAULT now() NOT NULL
);
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


-- Support Tickets Table
CREATE TABLE "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "date" "timestamptz" DEFAULT now() NOT NULL,
    "fromUserId" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "fromUserName" "text" NOT NULL,
    "fromUserEmail" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "isRead" "bool" DEFAULT false,
    "isReplied" "bool" DEFAULT false
);
ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;

-- App Config Table
CREATE TABLE "public"."app_config" (
    "key" "text" NOT NULL PRIMARY KEY,
    "value" "jsonb" NOT NULL
);
ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


-- =================================================================
-- 3. Insert Initial Data
-- =================================================================

-- System Administrator
INSERT INTO "public"."users" (
  "id", "name", "email", "phone", "password", "role", "status", "defaultTrialPeriodDays"
) VALUES (
  'a1b2c3d4-e5f6-7890-1234-567890abcdef', -- A fixed UUID for the admin
  'عبدالاله البلوي',
  'qzmpty678@gmail.com',
  '0598360380',
  'Aa@0509091917', -- In a real app, this should be a hashed password.
  'مدير النظام',
  'نشط',
  14
);

-- App Configuration
INSERT INTO "public"."app_config" ("key", "value") VALUES
('salaryRepaymentPercentage', '{"value": 30}'),
('baseInterestRate', '{"value": 5.5}'),
('investorSharePercentage', '{"value": 70}'),
('graceTotalProfitPercentage', '{"value": 30}'),
('graceInvestorSharePercentage', '{"value": 33.3}'),
('supportEmail', '{"value": "qzmpty678@gmail.com"}'),
('supportPhone', '{"value": "0598360380"}');


-- =================================================================
-- 4. Set up Row Level Security (RLS) Policies
-- =================================================================
-- This is a critical security step. It ensures users can only access their own data.

-- Helper function to get the current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT "role" INTO user_role FROM public.users WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Helper function to get the current user's manager ID
CREATE OR REPLACE FUNCTION get_my_manager_id()
RETURNS uuid AS $$
DECLARE
  manager_id uuid;
BEGIN
  -- If user is an office manager, their manager ID is their own ID
  SELECT CASE WHEN "role" = 'مدير المكتب' THEN "id" ELSE "managedBy" END INTO manager_id 
  FROM public.users WHERE id = auth.uid();
  RETURN manager_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Users Table Policies
CREATE POLICY "Users can view their own data" ON "public"."users" FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON "public"."users" FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "System Admins can manage all users" ON "public"."users" FOR ALL USING (get_my_role() = 'مدير النظام');
CREATE POLICY "Office Managers can view their team" ON "public"."users" FOR SELECT USING ("managedBy" = get_my_manager_id());
CREATE POLICY "Office Managers can create their team" ON "public"."users" FOR INSERT WITH CHECK ("managedBy" = auth.uid() AND get_my_role() = 'مدير المكتب');

-- Branches Policies
CREATE POLICY "Office Managers can manage their own branches" ON "public"."branches" FOR ALL
USING (user_id = auth.uid() AND get_my_role() = 'مدير المكتب');

-- Investors Policies
CREATE POLICY "Investors can see their own data" ON "public"."investors" FOR SELECT USING (id = auth.uid());
CREATE POLICY "Team members can see investors in their office" ON "public"."investors" FOR SELECT USING (
    (SELECT "managedBy" FROM public.users WHERE id = "public"."investors"."id") = get_my_manager_id()
);
CREATE POLICY "Office Managers/Assistants can add investors" ON "public"."investors" FOR INSERT WITH CHECK (
    get_my_role() IN ('مدير المكتب', 'مساعد مدير المكتب', 'موظف')
);
CREATE POLICY "System Admins can manage all investors" ON "public"."investors" FOR ALL USING (get_my_role() = 'مدير النظام');

-- Borrowers Policies
CREATE POLICY "Team members can see borrowers in their office" ON "public"."borrowers" FOR SELECT USING (
    "submittedBy" IN (SELECT id FROM public.users WHERE "managedBy" = get_my_manager_id() OR id = get_my_manager_id())
);
CREATE POLICY "Office Managers/Assistants/Employees can add borrowers" ON "public"."borrowers" FOR INSERT WITH CHECK (
    get_my_role() IN ('مدير المكتب', 'مساعد مدير المكتب', 'موظف') AND "submittedBy" = auth.uid()
);
CREATE POLICY "System Admins can manage all borrowers" ON "public"."borrowers" FOR ALL USING (get_my_role() = 'مدير النظام');

-- Transactions Policies
CREATE POLICY "Investors can see their own transactions" ON "public"."transactions" FOR SELECT USING ("investor_id" = auth.uid());
CREATE POLICY "Office team can see transactions of their investors" ON "public"."transactions" FOR SELECT USING (
    "investor_id" IN (SELECT id FROM public.users WHERE "managedBy" = get_my_manager_id())
);
CREATE POLICY "System Admins can manage all transactions" ON "public"."transactions" FOR ALL USING (get_my_role() = 'مدير النظام');

-- Notifications Policies
CREATE POLICY "Users can see their own notifications" ON "public"."notifications" FOR SELECT USING ("recipient_id" = auth.uid());

-- Support Tickets Policies
CREATE POLICY "Users can create support tickets" ON "public"."support_tickets" FOR INSERT WITH CHECK ("fromUserId" = auth.uid());
CREATE POLICY "System Admins can manage all support tickets" ON "public"."support_tickets" FOR ALL USING (get_my_role() = 'مدير النظام');

-- App Config Policies
CREATE POLICY "Allow public read access to app_config" ON "public"."app_config" FOR SELECT USING (true);
CREATE POLICY "System Admins can manage app_config" ON "public"."app_config" FOR ALL USING (get_my_role() = 'مدير النظام');

-- Policies for junction tables
CREATE POLICY "Allow team members to manage funders for their borrowers" ON "public"."borrower_funders" FOR ALL USING (
    "borrower_id" IN (SELECT id FROM public.borrowers WHERE "submittedBy" IN (SELECT id FROM public.users WHERE "managedBy" = get_my_manager_id() OR id = get_my_manager_id()))
);
CREATE POLICY "Allow team members to manage installments for their borrowers" ON "public"."borrower_installments" FOR ALL USING (
    "borrower_id" IN (SELECT id FROM public.borrowers WHERE "submittedBy" IN (SELECT id FROM public.users WHERE "managedBy" = get_my_manager_id() OR id = get_my_manager_id()))
);
CREATE POLICY "System Admins can manage all junction tables" ON "public"."borrower_funders" FOR ALL USING (get_my_role() = 'مدير النظام');
CREATE POLICY "System Admins can manage all junction tables" ON "public"."borrower_installments" FOR ALL USING (get_my_role() = 'مدير النظام');


-- =================================================================
-- 5. Helper Functions & Triggers
-- =================================================================

-- This function automatically creates an investor profile when a user with the 'investor' role is created.
CREATE OR REPLACE FUNCTION "public"."create_investor_profile_for_new_user"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'مستثمر' THEN
    INSERT INTO public.investors (id, name, status, submitted_by)
    VALUES (NEW.id, NEW.name, NEW.status, NEW.managedBy);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is inserted.
CREATE TRIGGER "on_new_user_create_investor_profile"
AFTER INSERT ON "public"."users"
FOR EACH ROW
EXECUTE FUNCTION "public"."create_investor_profile_for_new_user"();


-- This function automatically updates the investor's name if the user's name changes.
CREATE OR REPLACE FUNCTION "public"."update_investor_name_on_user_update"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.investors
    SET name = NEW.name
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a user is updated.
CREATE TRIGGER "on_user_update_sync_investor_name"
AFTER UPDATE OF name ON "public"."users"
FOR EACH ROW
EXECUTE FUNCTION "public"."update_investor_name_on_user_update"();


-- =================================================================
-- End of Script
-- =================================================================
