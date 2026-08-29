'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Loader2, Zap, Smartphone } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useUser } from '@/context/auth-context';
import { useSubscription } from '@/context/subscription-context';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const PLAY_STORE_LISTING_URL = `https://play.google.com/store/apps/details?id=${process.env.NEXT_PUBLIC_GOOGLE_PLAY_PACKAGE_NAME ?? ''}`;

export default function PricingPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const { subscription, hasActiveSubscription } = useSubscription();
  const [supabase] = useState(() => createClient());
  const { toast } = useToast();
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    setIsNativeApp(Capacitor.isNativePlatform());
  }, []);

  const plans = [
    {
      name: 'Hobby',
      planKey: 'hobby',
      productId: process.env.NEXT_PUBLIC_GOOGLE_PLAY_HOBBY_PRODUCT_ID!,
      planId: process.env.NEXT_PUBLIC_GOOGLE_PLAY_HOBBY_PLAN_ID!,
      price: 6.99,
      period: t('pricing.month'),
      features: [
        t('pricing.features.up_to_50'),
        t('pricing.features.inventory'),
        t('pricing.features.reports'),
        t('pricing.features.recipe_archive'),
        t('pricing.features.no_ads'),
      ],
    },
    {
      name: 'Pro',
      planKey: 'pro',
      productId: process.env.NEXT_PUBLIC_GOOGLE_PLAY_PRO_PRODUCT_ID!,
      planId: process.env.NEXT_PUBLIC_GOOGLE_PLAY_PRO_PLAN_ID!,
      price: 9.99,
      period: t('pricing.month'),
      features: [
        t('pricing.features.up_to_100'),
        t('pricing.features.inventory'),
        t('pricing.features.reports'),
        t('pricing.features.recipe_archive'),
        t('pricing.features.no_ads'),
      ],
    },
    {
      name: t('pricing.pro_annual_plan_name'),
      planKey: 'annual',
      productId: process.env.NEXT_PUBLIC_GOOGLE_PLAY_ANNUAL_PRODUCT_ID!,
      planId: process.env.NEXT_PUBLIC_GOOGLE_PLAY_ANNUAL_PLAN_ID!,
      price: 49.99,
      period: t('pricing.year'),
      features: [
        t('pricing.features.up_to_120'),
        t('pricing.features.inventory'),
        t('pricing.features.reports'),
        t('pricing.features.recipe_archive'),
        t('pricing.features.no_ads'),
      ],
    },
  ];

  const handlePurchase = async (productId: string, planId: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: t('pricing.error_not_logged_in_title'),
        description: t('pricing.error_not_logged_in_desc'),
      });
      return;
    }

    // Google Play non impedisce l'acquisto di piu' abbonamenti diversi in
    // parallelo (hobby/pro/annual sono prodotti separati, non base plan
    // dello stesso abbonamento): blocchiamo qui per evitare doppi addebiti.
    // I bottoni sono gia' disabilitati in UI, questo e' un controllo di
    // sicurezza in piu' nel caso lo stato risultasse non aggiornato.
    if (hasActiveSubscription) {
      toast({
        variant: 'destructive',
        title: t('pricing.error_already_subscribed_title'),
        description: t('pricing.error_already_subscribed_desc'),
      });
      return;
    }

    setLoadingProductId(productId);

    try {
      // Confermiamo l'acquisto solo dopo la verifica server-side (mai fidarsi
      // della sola risposta lato client): niente autoAcknowledgePurchases.
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        planIdentifier: planId,
        productType: PURCHASE_TYPE.SUBS,
        autoAcknowledgePurchases: false,
      });

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/play-billing/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ purchaseToken: transaction.purchaseToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || t('pricing.error_checkout_desc'));
      }

      toast({
        title: t('subscribe.success_title'),
        description: t('subscribe.success_description'),
      });

      // Il contesto abbonamento (subscription-context) e' caricato una sola
      // volta al login e non si aggiorna da solo dopo un acquisto: senza
      // questo reload l'utente vedeva ancora tutti i piani acquistabili per
      // qualche istante e poteva finire per sottoscriverne un secondo prima
      // che l'app si accorgesse del primo. Teniamo i bottoni disabilitati
      // (non resettiamo loadingProductId) fino al reload, cosi' non si puo'
      // cliccare altro nel frattempo.
      setTimeout(() => window.location.reload(), 1500);
      return;
    } catch (error: any) {
      console.error('Play Billing purchase error:', error);
      toast({
        variant: 'destructive',
        title: t('pricing.error_checkout_title'),
        description: error.message || t('pricing.error_checkout_desc'),
      });
      setLoadingProductId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-2">
          <Zap className="h-10 w-10" />
          {t('pricing.title')}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{t('pricing.description')}</p>
      </div>

      {!isNativeApp && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Smartphone className="h-10 w-10 text-primary" />
            <p className="font-medium">{t('pricing.android_only_title')}</p>
            <p className="text-sm text-muted-foreground max-w-md">{t('pricing.android_only_description')}</p>
            <Button asChild>
              <a href={PLAY_STORE_LISTING_URL} target="_blank" rel="noopener noreferrer">
                {t('pricing.android_only_button')}
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {hasActiveSubscription && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="font-medium">{t('pricing.already_subscribed_notice')}</p>
            <Button asChild variant="outline">
              <Link href="/settings">{t('settings.manage_subscription_button')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card key={plan.name} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">€{plan.price}</span>
                <span className="text-muted-foreground">/ {plan.period}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <p>{t('pricing.includes')}</p>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className="p-6 pt-0">
              {subscription?.subscriptionPlan === plan.planKey && hasActiveSubscription ? (
                <Button className="w-full" variant="outline" disabled>
                  {t('settings.current_plan')}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handlePurchase(plan.productId, plan.planId)}
                  disabled={!isNativeApp || !!loadingProductId || hasActiveSubscription}
                >
                  {loadingProductId === plan.productId ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    t('pricing.start_trial_button')
                  )}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
       <p className="text-center text-xs text-muted-foreground">{t('pricing.trial_note')}</p>
    </div>
  );
}
