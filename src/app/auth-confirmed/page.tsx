'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { CheckCircle } from 'lucide-react';

export default function AuthConfirmedPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4">
            <div className="mb-6">
                <Logo />
            </div>
            <Card className="w-full max-w-md text-center">
                <CardHeader className="items-center">
                    <CheckCircle className="h-16 w-16 text-success mb-4" />
                    <CardTitle className="text-2xl">تم تأكيد بريدك الإلكتروني بنجاح!</CardTitle>
                    <CardDescription className="text-base/relaxed pt-2">
                       أصبحت الآن جاهزًا لتسجيل الدخول إلى حسابك.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        إذا أردت تسجيل الدخول، اضغط على{' '}
                        <Link href="/login" className="underline text-primary hover:text-primary/80 font-semibold">
                            هنا
                        </Link>
                        .
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
