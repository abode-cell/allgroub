'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataState } from '@/contexts/data-context';
import { Mail, Phone, Rocket, TrendingUp, Handshake, CheckCircle } from 'lucide-react';


const Logo = () => (
    <div className="flex items-center gap-3">
        <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
        >
            <path d="M12 2L2 22H22L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M12 11L7 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M12 11L17 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M8.5 18H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
        <span className="font-bold text-2xl text-foreground">مجموعة عال</span>
    </div>
);


export default function LandingPage() {
    const { supportEmail, supportPhone } = useDataState();

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
                    <Logo />
                    <nav className="hidden md:flex gap-6 items-center text-lg font-medium">
                        <a href="#services" className="transition-colors hover:text-primary">الخدمات</a>
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
                <section className="w-full py-20 md:py-32 lg:py-40 bg-muted/50">
                    <div className="container mx-auto px-4 md:px-6 text-center">
                        <div className="flex flex-col items-center space-y-6">
                            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-primary">
                                مجموعة عال: حيث تلتقي الفرص برأس المال
                            </h1>
                            <p className="max-w-[700px] text-muted-foreground md:text-xl">
                                منصة تمويل متكاملة تربط مدراء المكاتب الباحثين عن سيولة مع المستثمرين الطموحين، لخلق منظومة نمو مشتركة وفعّالة.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button asChild size="lg">
                                    <Link href="/signup">ابحث عن تمويل لمكتبك</Link>
                                </Button>
                                <Button asChild size="lg" variant="secondary">
                                    <Link href="/signup">ابدأ الاستثمار الآن</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section id="services" className="w-full py-12 md:py-24">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">كيف نعمل</div>
                            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">منظومة تمويل مبسطة وفعّالة</h2>
                            <p className="max-w-[900px] text-muted-foreground md:text-lg/relaxed lg:text-base/relaxed xl:text-lg/relaxed">
                                نسهّل عملية الربط بين الفرص التمويلية ورأس المال عبر ثلاث خطوات بسيطة.
                            </p>
                        </div>
                        <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-3 md:gap-12">
                            <div className="grid gap-2 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                                    <Rocket className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold">1. تقديم الطلب</h3>
                                <p className="text-muted-foreground">
                                    يقدم مدير المكتب طلب تمويل واضح ومفصل عبر المنصة، محدداً المبلغ المطلوب والغرض منه.
                                </p>
                            </div>
                             <div className="grid gap-2 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                                    <Handshake className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold">2. التمويل</h3>
                                <p className="text-muted-foreground">
                                    يستعرض المستثمرون الفرص المتاحة ويقومون بتمويل المشاريع التي تتوافق مع أهدافهم الاستثمارية.
                                </p>
                            </div>
                            <div className="grid gap-2 text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground mb-4">
                                    <TrendingUp className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-bold">3. النمو المشترك</h3>
                                <p className="text-muted-foreground">
                                    يحصل المكتب على السيولة اللازمة للنمو، ويحقق المستثمر عوائد مجدية على استثماراته.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Features Split Section */}
                <section className="w-full py-12 md:py-24 bg-muted/50">
                    <div className="container grid items-center justify-center gap-8 px-4 md:px-6 lg:grid-cols-2 lg:gap-16">
                        <div id="for-managers" className="space-y-4">
                            <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">لأصحاب المكاتب</div>
                            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">تمويل يواكب طموحاتك</h2>
                            <p className="text-muted-foreground md:text-lg">
                                احصل على السيولة التي تحتاجها لتنمية أعمالك وتوسيع نطاقها بكل سهولة ويسر.
                            </p>
                             <ul className="grid gap-4 text-lg">
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                                    <span>وصول سريع ومباشر إلى شبكة من المستثمرين الجادين.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                                    <span>عملية تقديم طلبات إلكترونية مبسطة وواضحة.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-accent" />
                                    <span>لوحة تحكم متكاملة لإدارة قروضك ومتابعة السداد.</span>
                                </li>
                            </ul>
                        </div>
                        <div id="for-investors" className="space-y-4">
                            <div className="inline-block rounded-lg bg-accent px-3 py-1 text-sm text-accent-foreground">للمستثمرين</div>
                             <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">استثمار ذكي بعوائد مجدية</h2>
                             <p className="text-muted-foreground md:text-lg">
                                استثمر أموالك في فرص تمويلية واعدة وحقق عوائد مالية مستقرة.
                            </p>
                             <ul className="grid gap-4 text-lg">
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                                    <span>فرص استثمارية متنوعة في قطاعات مختلفة.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                                    <span>شفافية كاملة مع تقارير أداء مفصلة ومتابعة حية للأرباح.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                                    <span>تحكم كامل في محفظتك الاستثمارية وتوزيع رأس المال.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>
                
                {/* Contact Section */}
                <section id="contact" className="w-full py-12 md:py-24">
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
                <div className="container mx-auto py-6 text-center text-muted-foreground">
                    &copy; {new Date().getFullYear()} مجموعة عال. جميع الحقوق محفوظة.
                </div>
            </footer>
        </div>
    );
}
