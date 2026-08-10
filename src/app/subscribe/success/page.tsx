
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { getSubscriptionData } from '@/ai/flows/stripe-flows';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/language-context';

function SuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useLanguage();
    const [message, setMessage] = useState(t('subscribe.processing'));
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const sessionId = searchParams.get('session_id');

        if (isUserLoading || isUpdating || !user || !firestore || !sessionId) {
            return;
        }

        const updateSubscription = async () => {
            setIsUpdating(true);
            try {
                // Recupero dati da Stripe
                const subData = await getSubscriptionData({ sessionId });

                // Aggiornamento Firestore con ID ed Email per superare le regole di sicurezza
                const userDocRef = doc(firestore, 'users', user.uid);
                
                await setDoc(userDocRef, {
                    id: user.uid,
                    email: user.email || '',
                    stripeCustomerId: subData.stripeCustomerId,
                    subscriptionPlan: subData.subscriptionPlan,
                    subscriptionStatus: subData.subscriptionStatus,
                    subscriptionPeriodEndDate: subData.subscriptionPeriodEndDate,
                }, { merge: true });

                setMessage(t('subscribe.success_message'));
                toast({
                    title: t('subscribe.success_title'),
                    description: t('subscribe.success_description'),
                });

                setTimeout(() => {
                    router.push('/dashboard');
                }, 2000);

            } catch (error: any) {
                console.error("Errore aggiornamento:", error);
                setMessage(t('subscribe.error_update_failed'));
                toast({
                    variant: 'destructive',
                    title: t('subscribe.error_title'),
                    description: error.message || t('subscribe.error_update_failed'),
                });
            }
        };

        updateSubscription();
    }, [user, isUserLoading, firestore, router, searchParams, toast, t, isUpdating]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                        <PartyPopper className="h-10 w-10 text-green-500" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">{t('subscribe.success_card_title')}</CardTitle>
                    <CardDescription>{t('subscribe.success_card_description')}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">{message}</p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
            <SuccessContent />
        </Suspense>
    );
}
