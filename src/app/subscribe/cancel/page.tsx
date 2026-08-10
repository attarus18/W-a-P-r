'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import Link from 'next/link';

export default function CancelPage() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <XCircle className="h-10 w-10 text-destructive" />
                </div>
                <CardTitle className="mt-4 text-2xl">{t('subscribe.cancel_title')}</CardTitle>
                <CardDescription>{t('subscribe.cancel_description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{t('subscribe.cancel_note')}</p>
            </CardContent>
             <CardFooter className="flex justify-center gap-4">
                <Button asChild>
                    <Link href="/pricing">{t('subscribe.cancel_button_retry')}</Link>
                </Button>
                <Button variant="ghost" asChild>
                     <Link href="/dashboard">{t('subscribe.cancel_button_dashboard')}</Link>
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
