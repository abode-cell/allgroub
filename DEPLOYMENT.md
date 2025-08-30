# دليل النشر - منصة عال

## متطلبات النشر

### 1. البيئة المطلوبة
- Node.js 18+
- حساب Supabase مُفعَّل
- خدمة استضافة تدعم Next.js (Vercel, Netlify, أو خادم VPS)

### 2. إعداد قاعدة البيانات

#### أ. إنشاء مشروع Supabase جديد
1. انتقل إلى [supabase.com](https://supabase.com)
2. أنشئ مشروع جديد
3. احفظ URL المشروع و API Keys

#### ب. تطبيق مخطط قاعدة البيانات
1. افتح **SQL Editor** في لوحة تحكم Supabase
2. انسخ محتوى `supabase/schema.sql` بالكامل
3. الصق الكود واضغط **RUN**
4. تأكد من عدم وجود أخطاء

#### ج. نشر Edge Functions
```bash
# تثبيت Supabase CLI
npm install -g @supabase/cli

# تسجيل الدخول
supabase login

# ربط المشروع
supabase link --project-ref YOUR_PROJECT_ID

# نشر Functions
supabase functions deploy create-office-manager
supabase functions deploy create-investor
supabase functions deploy create-subordinate
supabase functions deploy handle-partial-payment
supabase functions deploy update-user-credentials
```

### 3. إعداد متغيرات البيئة

#### للإنتاج
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Security (اختياري)
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### 4. بناء المشروع

```bash
# تثبيت التبعيات
npm ci

# فحص الأنواع
npm run typecheck

# بناء المشروع
npm run build

# اختبار البناء محلياً
npm start
```

### 5. النشر على Vercel

#### أ. النشر التلقائي
1. ادفع الكود إلى GitHub
2. اربط المستودع بـ Vercel
3. أضف متغيرات البيئة في إعدادات Vercel
4. انشر المشروع

#### ب. النشر اليدوي
```bash
# تثبيت Vercel CLI
npm install -g vercel

# نشر المشروع
vercel --prod
```

### 6. النشر على خادم VPS

#### أ. إعداد الخادم
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# تثبيت PM2
sudo npm install -g pm2

# تثبيت Nginx
sudo apt install nginx -y
```

#### ب. نشر التطبيق
```bash
# استنساخ المشروع
git clone <repository-url>
cd al-finance-platform

# تثبيت التبعيات
npm ci

# بناء المشروع
npm run build

# تشغيل مع PM2
pm2 start npm --name "al-finance" -- start
pm2 save
pm2 startup
```

#### ج. إعداد Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7. إعداد SSL

```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx -y

# الحصول على شهادة SSL
sudo certbot --nginx -d your-domain.com

# تجديد تلقائي
sudo crontab -e
# أضف: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 8. إنشاء حساب مدير النظام

بعد النشر، قم بإنشاء حساب مدير النظام:

1. انتقل إلى صفحة التسجيل
2. استخدم البيانات من `system_admin_credentials.csv`
3. أو أنشئ حساب جديد وغيّر دوره في قاعدة البيانات:

```sql
UPDATE users 
SET role = 'مدير النظام', status = 'نشط' 
WHERE email = 'your-admin-email@example.com';
```

### 9. اختبار النشر

#### قائمة التحقق
- [ ] تحميل الصفحة الرئيسية
- [ ] تسجيل الدخول يعمل
- [ ] إنشاء حساب جديد يعمل
- [ ] لوحة التحكم تظهر البيانات
- [ ] إضافة مستثمر جديد
- [ ] إضافة قرض جديد
- [ ] التقارير تعمل
- [ ] الإشعارات تعمل
- [ ] تسجيل الخروج يعمل

### 10. المراقبة والصيانة

#### أ. مراقبة الأداء
- استخدم Vercel Analytics أو Google Analytics
- راقب أوقات الاستجابة
- تتبع معدلات الأخطاء

#### ب. النسخ الاحتياطي
```bash
# نسخ احتياطي لقاعدة البيانات (يومياً)
# استخدم Supabase Dashboard > Settings > Database > Backups
```

#### ج. التحديثات
```bash
# تحديث التبعيات
npm update

# فحص الثغرات الأمنية
npm audit

# إصلاح الثغرات
npm audit fix
```

### 11. استكشاف الأخطاء

#### مشاكل شائعة وحلولها

**خطأ في الاتصال بقاعدة البيانات:**
- تحقق من صحة متغيرات البيئة
- تأكد من تفعيل RLS policies
- راجع صلاحيات API keys

**مشاكل في المصادقة:**
- تحقق من إعدادات Auth في Supabase
- تأكد من تفعيل Email confirmation
- راجع Redirect URLs

**بطء في الأداء:**
- فعّل CDN
- حسّن الصور
- استخدم caching strategies

### 12. الأمان في الإنتاج

- [ ] تفعيل HTTPS
- [ ] إعداد CSP headers
- [ ] تحديث كلمات المرور الافتراضية
- [ ] مراجعة صلاحيات قاعدة البيانات
- [ ] تفعيل rate limiting
- [ ] إعداد monitoring للأنشطة المشبوهة

### 13. النسخة التجريبية مقابل الإنتاج

#### الاختلافات الرئيسية:
- **قاعدة البيانات**: منفصلة للإنتاج
- **المتغيرات**: قيم إنتاج حقيقية
- **المراقبة**: تفعيل جميع أدوات المراقبة
- **النسخ الاحتياطي**: جدولة تلقائية
- **الأمان**: تشديد جميع الإعدادات

---

**ملاحظة مهمة**: تأكد من اختبار جميع الوظائف في بيئة staging قبل النشر للإنتاج.