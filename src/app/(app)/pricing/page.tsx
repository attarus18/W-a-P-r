'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Loader2, Zap } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useUser } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import { createCheckoutSession } from '@/ai/flows/stripe-flows';
import { useToast } from '@/hooks/use-toast';

export default function PricingPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const [supabase] = useState(() => createClient());
  const { toast } = useToast();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const plans = [
    {
      name: 'Hobby',
      priceId: process.env.NEXT_PUBLIC_STRIPE_HOBBY_PRICE_ID!,
      price: 6.99,
      period: t('pricing.month'),
      features: [
        t('pricing.features.up_to_50'),
        t('pricing.features.inventory'),
        t('pricing.features.reports'),
        t('pricing.features.ai_suggester'),
      ],
    },
    {
      name: 'Pro',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
      price: 9.99,
      period: t('pricing.month'),
      features: [
        t('pricing.features.up_to_100'),
        t('pricing.features.inventory'),
        t('pricing.features.reports'),
        t('pricing.features.ai_suggester'),
      ],
    },
    {
      name: t('pricing.pro_annual_plan_name'),
      priceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID!,
      price: 49.99,
      period: t('pricing.year'),
      features: [
        t('pricing.features.up_to_120'),
        t('pricing.features.inventory'),
        t('pricing.features.reports'),
        t('pricing.features.ai_suggester'),
      ],
    },
  ];

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: t('pricing.error_not_logged_in_title'),
        description: t('pricing.error_not_logged_in_desc'),
      });
      return;
    }

    if (!user.email) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'User email not found. Cannot proceed with checkout.',
        });
        return;
    }

    setLoadingPriceId(priceId);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      // Inviamo gli URL di successo e annullamento basati sull'origine corrente del browser
      const { url } = await createCheckoutSession({
        priceId,
        userId: user.id,
        email: user.email,
        stripeCustomerId: profile?.stripe_customer_id ?? undefined,
        successUrl: `${window.location.origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/subscribe/cancel`,
      });

      if (url) {
        window.location.assign(url);
      } else {
        throw new Error("Impossibile generare l'URL di pagamento.");
      }

    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      toast({
        variant: 'destructive',
        title: t('pricing.error_checkout_title'),
        description: error.message || t('pricing.error_checkout_desc'),
      });
    } finally {
      setTimeout(() => setLoadingPriceId(null), 5000);
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
              <Button
                className="w-full"
                onClick={() => handleCheckout(plan.priceId)}
                disabled={!!loadingPriceId}
              >
                {loadingPriceId === plan.priceId ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  t('pricing.start_trial_button')
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
       <p className="text-center text-xs text-muted-foreground">{t('pricing.trial_note')}</p>
    </div>
  );
}