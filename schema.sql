-- #############################################
-- # 1. تعريف الأنواع المخصصة (Custom Types) #
-- #############################################
-- هذه الأنواع تضمن أن القيم في الأعمدة المحددة تكون دائمًا من ضمن قائمة محددة.

CREATE TYPE public.user_status AS ENUM (
    'نشط',
    'معلق'
);

CREATE TYPE public.user_role AS ENUM (
    'مدير النظام',
    'مدير المكتب',
    'موظف',
    'مستثمر'
);

CREATE TYPE public.loan_status AS ENUM (
    'منتظم',
    'متأخر',
    'مسدد بالكامل',
    'متعثر',
    'معلق',
    'مرفوض'
);

CREATE TYPE public.loan_type AS ENUM (
    'اقساط',
    'مهلة'
);

CREATE TYPE public.investor_status AS ENUM (
    'نشط',
    'غير نشط',
    'معلق',
    'مرفوض'
);

-- #############################################
-- # 2. إنشاء الجداول (Create Tables)           #
-- #############################################

-- جدول المستخدمين (Profiles)
-- هذا الجدول يكمل جدول المستخدمين الافتراضي في Supabase (auth.users)
-- ويضيف معلومات خاصة بالتطبيق مثل الدور والحالة.
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    "photoURL" text,
    role public.user_role NOT NULL DEFAULT 'موظف'::user_role,
    status public.user_status NOT NULL DEFAULT 'معلق'::user_status
);

-- جدول المقترضين (Borrowers)
CREATE TABLE public.borrowers (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    amount numeric NOT NULL,
    rate numeric NOT NULL,
    term integer NOT NULL,
    date date NOT NULL DEFAULT now(),
    "loanType" public.loan_type NOT NULL,
    status public.loan_status NOT NULL,
    "dueDate" date NOT NULL,
    "submittedBy" uuid REFERENCES auth.users(id),
    "rejectionReason" text
);

-- جدول المستثمرين (Investors)
CREATE TABLE public.investors (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    amount numeric NOT NULL,
    date date NOT NULL DEFAULT now(),
    status public.investor_status NOT NULL,
    "withdrawalHistory" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "fundedLoanIds" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    "defaultedFunds" numeric NOT NULL DEFAULT 0,
    "submittedBy" uuid REFERENCES auth.users(id),
    "rejectionReason" text
);

-- #############################################
-- # 3. تفعيل الأمان على مستوى الصف (RLS)      #
-- #############################################
-- هذا الجزء هو أهم جزء لضمان أمان بياناتك.
-- بدون هذه السياسات، أي شخص يملك مفتاح anon key سيتمكن من قراءة وتعديل كل البيانات.

-- تفعيل RLS للجداول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

-- --- سياسات جدول المستخدمين (Profiles Policies) ---

-- 1. السماح للمستخدمين بقراءة بياناتهم الشخصية فقط.
CREATE POLICY "Users can view their own profile."
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- 2. السماح للمستخدمين بتحديث بياناتهم الشخصية.
CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. السماح للمدراء بقراءة جميع بيانات المستخدمين.
CREATE POLICY "Managers can view all profiles."
ON public.profiles FOR SELECT
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('مدير النظام', 'مدير المكتب') );

-- 4. السماح للمدراء بتحديث جميع بيانات المستخدمين.
CREATE POLICY "Managers can update all profiles."
ON public.profiles FOR UPDATE
USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('مدير النظام', 'مدير المكتب') );


-- --- سياسات عامة للمقترضين والمستثمرين ---

-- 1. السماح لجميع المستخدمين المسجلين بقراءة البيانات.
CREATE POLICY "Authenticated users can view data." ON public.borrowers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view data." ON public.investors FOR SELECT USING (auth.role() = 'authenticated');

-- 2. السماح لجميع المستخدمين المسجلين بإضافة بيانات جديدة.
CREATE POLICY "Authenticated users can insert data." ON public.borrowers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert data." ON public.investors FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. السماح للمدراء فقط بتحديث البيانات.
CREATE POLICY "Managers can update data." ON public.borrowers FOR UPDATE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('مدير النظام', 'مدير المكتب') );
CREATE POLICY "Managers can update data." ON public.investors FOR UPDATE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('مدير النظام', 'مدير المكتب') );

-- 4. السماح للمدراء فقط بحذف البيانات.
CREATE POLICY "Managers can delete data." ON public.borrowers FOR DELETE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('مدير النظام', 'مدير المكتب') );
CREATE POLICY "Managers can delete data." ON public.investors FOR DELETE USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('مدير النظام', 'مدير المكتب') );

