# منصة عال - نظام إدارة التمويل والاستثمار

منصة متكاملة لإدارة التمويل والاستثمارات والقروض مبنية بتقنيات حديثة.

## المميزات الرئيسية

- 🏢 **إدارة المكاتب والفروع**: نظام هرمي لإدارة المكاتب المتعددة
- 👥 **إدارة المستخدمين**: أدوار وصلاحيات متقدمة
- 💰 **إدارة المستثمرين**: تتبع رؤوس الأموال والأرباح
- 📋 **إدارة القروض**: نظامي الأقساط والمهلة
- 📊 **التقارير والتحليلات**: لوحات تحكم تفاعلية
- 🔒 **الأمان**: مصادقة متقدمة وحماية البيانات
- 📱 **تصميم متجاوب**: يعمل على جميع الأجهزة

## التقنيات المستخدمة

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI**: Tailwind CSS, Radix UI, Shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **State Management**: React Context API
- **Forms**: React Hook Form, Zod validation
- **Charts**: Recharts
- **Testing**: Jest, React Testing Library

## متطلبات النظام

- Node.js 18+ 
- npm أو yarn
- حساب Supabase

## التثبيت والإعداد

### 1. استنساخ المشروع
```bash
git clone <repository-url>
cd al-finance-platform
npm install
```

### 2. إعداد متغيرات البيئة
```bash
cp .env.example .env.local
```

قم بتحديث الملف `.env.local` بالقيم الصحيحة:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. إعداد قاعدة البيانات

1. انتقل إلى لوحة تحكم Supabase
2. افتح **SQL Editor**
3. انسخ محتوى ملف `supabase/schema.sql` بالكامل
4. الصق الكود واضغط **RUN**

### 4. إعداد Edge Functions

قم بنشر Edge Functions إلى Supabase:
```bash
# تأكد من تثبيت Supabase CLI أولاً
supabase functions deploy create-office-manager
supabase functions deploy create-investor  
supabase functions deploy create-subordinate
supabase functions deploy handle-partial-payment
supabase functions deploy update-user-credentials
```

### 5. تشغيل المشروع
```bash
npm run dev
```

## البناء للإنتاج

```bash
# بناء المشروع
npm run build

# تشغيل النسخة المبنية
npm start

# فحص الأنواع
npm run typecheck

# تحليل حجم الحزمة
npm run analyze
```

## الاختبارات

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل الاختبارات في وضع المراقبة
npm run test:watch

# تقرير التغطية
npm run test:coverage
```

## هيكل المشروع

```
src/
├── app/                    # صفحات Next.js App Router
├── components/             # مكونات React قابلة للإعادة الاستخدام
├── contexts/              # Context providers
├── hooks/                 # Custom React hooks
├── lib/                   # مكتبات ووظائف مساعدة
│   ├── supabase/         # إعدادات Supabase
│   ├── types.ts          # تعريفات الأنواع
│   ├── utils.ts          # وظائف مساعدة
│   ├── validation.ts     # قواعد التحقق
│   ├── constants.ts      # الثوابت
│   ├── security.ts       # وظائف الأمان
│   └── performance.ts    # تحسينات الأداء
└── __tests__/            # ملفات الاختبارات

supabase/
├── functions/            # Edge Functions
├── migrations/           # ملفات الهجرة
└── schema.sql           # مخطط قاعدة البيانات
```

## الأدوار والصلاحيات

### مدير النظام
- إدارة جميع المكاتب والمستخدمين
- الوصول لجميع البيانات والتقارير
- إعدادات النظام العامة

### مدير المكتب  
- إدارة مكتبه وفروعه
- إضافة المستثمرين والموظفين
- الموافقة على الطلبات

### مساعد مدير المكتب
- صلاحيات محددة حسب التفويض
- مساعدة في إدارة العمليات اليومية

### الموظف
- إدخال طلبات القروض والمستثمرين
- عرض البيانات المسموحة

### المستثمر
- عرض محفظته الاستثمارية
- تتبع الأرباح والعمليات المالية

## الأمان والحماية

- 🔐 **مصادقة متقدمة**: نظام مصادقة آمن مع Supabase Auth
- 🛡️ **Row Level Security**: حماية البيانات على مستوى الصفوف
- 🔑 **إدارة الصلاحيات**: نظام أدوار وصلاحيات مفصل
- 🚫 **منع SQL Injection**: استخدام Prepared Statements
- 🔒 **تشفير البيانات**: تشفير البيانات الحساسة

## الأداء والتحسين

- ⚡ **تحميل تدريجي**: تحميل المكونات عند الحاجة
- 🗜️ **ضغط الصور**: تحسين الصور تلقائياً
- 📦 **تقسيم الحزم**: تقسيم الكود لتحسين الأداء
- 🔄 **التخزين المؤقت**: استراتيجيات تخزين مؤقت ذكية

## المساهمة

1. Fork المشروع
2. إنشاء فرع للميزة الجديدة (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للفرع (`git push origin feature/amazing-feature`)
5. فتح Pull Request

## الدعم الفني

للحصول على الدعم الفني:
- 📧 البريد الإلكتروني: qzmpty678@gmail.com
- 📱 الهاتف: 0598360380

## الترخيص

هذا المشروع محمي بحقوق الطبع والنشر © 2024 مجموعة عال. جميع الحقوق محفوظة.
