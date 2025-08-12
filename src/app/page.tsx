'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, Rocket, TrendingUp, Handshake, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function LandingPage() {
    // These values can be fetched from a global config or context if they need to be dynamic.
    // For a simple landing page, hardcoding is fine.
    const supportEmail = 'qzmpty678@gmail.com';
    const supportPhone = '0598360380';

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
                    <Logo />
                    <nav className="hidden md:flex gap-6 items-center text-lg font-medium">
                        <a href="#services" className="transition-colors hover:text-primary">آلية العمل</a>
                        <a href="#for-managers" className="transition-colors hover:text-primary">للمكاتب</a>
                        <a href="#for-investors" className="transition-colors hover:text-primary">للمستثمرين</a>
                        <a href="#contact" className="transition-colors hover:text-primary">تواصل معنا</a>
                    </nav>
                    <div className="flex items-center gap-2">
                         <Button asChild variant="outline">
                            <Link href="/login">تسجيل الدخول</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/signup">إنشاء حساب</Link>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {/* Hero Section */}
                <section className="w-full min-h-screen flex items-center justify-center bg-muted/50">
                    <div className="container mx-auto px-4 md:px-6 text-center">
                        <div className="flex flex-col items-center space-y-6">
                            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-primary">
                                حوّل تعقيدات التمويل إلى عمليات بسيطة ومؤتمتة
                            </h1>
                            <p className="max-w-[700px] text-muted-foreground md:text-xl">
                                منصة عال تزيل عنك عبء الحسابات اليدوية وتقسيم الأرباح. أدر عملياتك التمويلية بدقة، ووفّر وقتك الثمين للتركيز على نمو أعمالك.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button asChild size="lg">
                                    <Link href="/signup">ابدأ الآن: أنشئ حساب مكتبك</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="services" className="w-full min-h-screen flex items-center justify-center">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">آلية العمل</div>
                            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">منصة واحدة لإدارة دورتك المالية بالكامل</h2>
                            <p className="max-w-[900px] text-muted-foreground md:text-lg/relaxed lg:text-base/relaxed xl:text-lg/relaxed">
                                نحن لا نربطك بمستثمرين جدد، بل نمنحك الأداة لإدارة علاقتك مع مستثمريك الحاليين بكفاءة وشفافية.
                            </p>
                        </div>
                        <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-3 md:gap-12">
                            <div className="grid gap-2 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                                    <Rocket className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold">1. أنشئ حسابك</h3>
                                <p className="text-muted-foreground">
                                    يقوم مدير المكتب بإنشاء حساب وتحديد إعدادات المكتب الأساسية.
                                </p>
                            </div>
                             <div className="grid gap-2 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                                    <Handshake className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold">2. أضف بياناتك</h3>
                                <p className="text-muted-foreground">
                                    أضف المستثمرين الخاصين بك وعمليات القروض التي تديرها.
                                </p>
                            </div>
                            <div className="grid gap-2 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                                    <TrendingUp className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold">3. أدر وتابع</h3>
                                <p className="text-muted-foreground">
                                    استخدم لوحة التحكم لمتابعة كل شيء: من الأرصدة المتاحة إلى الأرباح المحققة والتقارير المفصلة.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* For Managers Section */}
                <section id="for-managers" className="w-full min-h-screen flex items-center justify-center bg-muted/50">
                    <div className="container px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">للمكتب: تحكم كامل وراحة بال</div>
                            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">إدارة مالية ذكية تمنحك التحكم والراحة</h2>
                            <p className="max-w-[900px] text-muted-foreground md:text-lg/relaxed">
                                صُممت منصة عال لتكون مساعدك المالي الذكي. ودّع جداول الإكسل المعقدة، والمتابعة اليدوية المرهقة، وأخطاء الحسابات. نحن نمنحك الأدوات اللازمة لإدارة دورتك المالية بدقة وسهولة، مما يتيح لك بناء علاقات أقوى مع مستثمريك وتنمية أعمالك بثقة.
                            </p>
                        </div>
                        <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 mt-12">
                            <div className="grid gap-2">
                                <h3 className="text-lg font-bold">إدارة مركزية للقروض</h3>
                                <p className="text-sm text-muted-foreground">
                                    أضف جميع المستثمرين والقروض في مكان واحد. تتبع كل عملية تمويل، وحدد حالة كل قرض، وتابع الأرصدة المتاحة بسهولة.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <h3 className="text-lg font-bold">حسابات أرباح دقيقة وتلقائية</h3>
                                <p className="text-sm text-muted-foreground">
                                    تقوم المنصة تلقائيًا بحساب حصص الأرباح لكل من المكتب والمستثمرين من كل قرض، مهما بلغت درجة تعقيد التمويل. لا مزيد من الأخطاء البشرية أو الساعات الضائعة.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <h3 className="text-lg font-bold">تقارير شاملة لاتخاذ القرارات</h3>
                                <p className="text-sm text-muted-foreground">
                                    احصل على تقارير مفصلة عن أداء القروض، وحالة المستثمرين، والأموال المتعثرة لاتخاذ قرارات مدروسة ومبنية على بيانات دقيقة.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <h3 className="text-lg font-bold">إدارة فريق العمل بصلاحيات</h3>
                                <p className="text-sm text-muted-foreground">
                                    أضف موظفيك ومساعديك، وتحكم في صلاحياتهم بدقة. يمكنك منحهم صلاحيات محددة مثل إضافة القروض أو إدارة المستثمرين، مما يضمن سير العمل بكفاءة وأمان.
                                </p>
                            </div>
                             <div className="grid gap-2">
                                <h3 className="text-lg font-bold text-primary flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> نظام ذكي لمنع تكرار العملاء</h3>
                                <p className="text-sm text-muted-foreground">
                                    عند محاولة إضافة عميل مسجل بقرض نشط في مكتب آخر، يقوم النظام بتنبيهك وعرض بيانات مدير المكتب الآخر، مع منحك خيار المتابعة لاتخاذ القرار المناسب.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <h3 className="text-lg font-bold">شفافية لبناء الثقة</h3>
                                <p className="text-sm text-muted-foreground">
                                    عندما تدعو مستثمرك للمنصة، فإنك تبني جسرًا من الثقة من خلال الشفافية المطلقة في عرض تفاصيل الاستثمارات والأرباح المحققة.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* For Investors Section */}
                 <section id="for-investors" className="w-full min-h-screen flex items-center justify-center">
                    <div className="container px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center">
                            <div className="inline-block rounded-lg bg-accent px-3 py-1 text-sm text-accent-foreground">للمستثمر: شفافية مطلقة وثقة تامة</div>
                             <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">بناء الثقة من خلال الشفافية</h2>
                             <p className="max-w-[900px] text-muted-foreground md:text-lg/relaxed">
                                عندما يدعوك مدير مكتبك للمنصة، فإنه يمنحك نافذة شفافة ومباشرة على استثماراتك، مما يعزز الثقة ويبني علاقات عمل طويلة الأمد ومبنية على الوضوح.
                            </p>
                        </div>
                         <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 mt-12">
                            <div className="grid gap-2">
                                <h3 className="text-lg font-bold">لوحة تحكم خاصة</h3>
                                <p className="text-sm text-muted-foreground">
                                    ادخل إلى حسابك الخاص وشاهد نظرة شاملة وفورية على إجمالي استثماراتك، الأموال النشطة، والأموال الخاملة المتاحة للاستثمار.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <h3 className="text-lg font-bold">متابعة حية للأرباح</h3>
                                <p className="text-sm text-muted-foreground">
                                    تعرف على أرباحك المتوقعة من كل استثمار، وتابع نمو محفظتك الاستثمارية من خلال رسوم بيانية وتقارير مبسطة.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <h3 className="text-lg font-bold">سجل عمليات واضح</h3>
                                <p className="text-sm text-muted-foreground">
                                    اطلع على سجل كامل لجميع عملياتك المالية من إيداع رأس المال، سحب الأرباح، أو إعادة استثمارها. كل شيء موثق بدقة.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <h3 className="text-lg font-bold">تفاصيل القروض الممولة</h3>
                                <p className="text-sm text-muted-foreground">
                                    شاهد تفاصيل القروض التي تم تمويلها بأموالك، وحالة كل قرض، مما يمنحك صورة كاملة عن كيفية توظيف استثماراتك.
                                </p>
                            </div>
                             <div className="grid gap-2">
                                <h3 className="text-lg font-bold">تنبيهات فورية</h3>
                                <p className="text-sm text-muted-foreground">
                                    احصل على إشعارات فورية عند تمويل قرض جديد بأموالك، أو عند تحقيق أرباح من استثماراتك المكتملة.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <h3 className="text-lg font-bold">تجربة آمنة واحترافية</h3>
                                <p className="text-sm text-muted-foreground">
                                    نظام آمن ومصمم باحترافية يمنحك الثقة في إدارة ومتابعة استثماراتك مع المكتب الذي تتعامل معه.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Contact Section */}
                <section id="contact" className="w-full min-h-screen flex items-center justify-center bg-muted/50">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="mx-auto max-w-3xl text-center space-y-4">
                             <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">هل أنت مستعد للبدء؟</h2>
                            <p className="text-muted-foreground md:text-lg">
                                تواصل معنا اليوم أو أنشئ حسابك مباشرة لبدء رحلتك في عالم التمويل والاستثمار.
                            </p>
                            <Card className="text-right">
                                <CardHeader>
                                    <CardTitle>تواصل مع فريق مجموعة عال</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="flex items-center gap-4">
                                        <Mail className="h-6 w-6 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                                            <a href={`mailto:${supportEmail}`} className="font-semibold text-primary" dir="ltr">
                                                {supportEmail}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Phone className="h-6 w-6 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">الهاتف</p>
                                            <a href={`tel:${supportPhone}`} className="font-semibold text-primary" dir="ltr">
                                                {supportPhone}
                                            </a>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

            </main>

            {/* Footer */}
            <footer className="w-full bg-muted border-t">
                <div className="container mx-auto py-6 text-center text-muted-foreground flex flex-col gap-2">
                    <p className="font-medium">تم انشاء الموقع بأيدي سعودية</p>
                    <p className="text-xs">&copy; {new Date().getFullYear()} مجموعة عال. جميع الحقوق محفوظة.</p>
                </div>
            </footer>
        </div>
    );
}
