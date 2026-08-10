'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/context/language-context";
import { useCurrency } from "@/context/currency-context";
import { User as UserIcon, LogOut, Loader2, Star, CreditCard, SunMoon, Settings, Link as LinkIcon } from "lucide-react";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import AccessDenied from "@/components/auth/access-denied";
import { useSubscription } from "@/context/subscription-context";
import { differenceInDays } from 'date-fns';
import { createStripePortalSession } from '@/ai/flows/stripe-flows';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ThemeToggle } from '@/components/settings/theme-toggle';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency, currencies } = useCurrency();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { subscription, hasActiveSubscription, isSubscriptionLoading } = useSubscription();
  const { toast } = useToast();
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');

  useEffect(() => {
    // Rileva l'origine corrente per mostrarla all'utente
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.push('/login');
  };

  const handleManageSubscription = async () => {
    if (!subscription?.stripeCustomerId) {
        toast({ variant: 'destructive', title: t('settings.stripe_customer_error') });
        return;
    }
    setIsPortalLoading(true);
    try {
        const { url } = await createStripePortalSession({ 
            stripeCustomerId: subscription.stripeCustomerId,
            returnUrl: window.location.href
        });
        window.location.href = url;
    } catch(error: any) {
        toast({ variant: 'destructive', title: t('settings.stripe_portal_error'), description: error.message });
        setIsPortalLoading(false);
    }
  };

  const remainingDays = subscription?.subscriptionPeriodEndDate
    ? differenceInDays(new Date(subscription.subscriptionPeriodEndDate), new Date())
    : 0;

  if (!user) {
    return <AccessDenied featureName={t('navbar.settings')} />;
  }

  const getPlanName = (planId: string | undefined | null) => {
    if (!planId) return '';
    if (planId === 'hobby') return 'Hobby';
    if (planId === 'pro') return 'Pro';
    if (planId === 'annual') return t('pricing.pro_annual_plan_name');
    return planId;
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            {t('settings.profile_title')}
          </CardTitle>
          {user && <CardDescription>{t('settings.logged_in_as', { email: user.email })}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="email">{t('settings.email_label')}</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled />
            </div>

            <div className="pt-4 border-t space-y-3">
                <Label className="flex items-center gap-2 text-primary">
                    <LinkIcon className="h-4 w-4" />
                    URL Applicazione (per Kodular/Stripe)
                </Label>
                <div className="bg-muted p-3 rounded-md font-mono text-[10px] sm:text-xs break-all select-all cursor-pointer border border-dashed border-primary/30" onClick={() => {
                    navigator.clipboard.writeText(currentOrigin);
                    toast({ title: "Copiato!", description: "Indirizzo copiato negli appunti." });
                }}>
                    {currentOrigin || 'Rilevamento in corso...'}
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                    * Assicurati che questo URL inizi con <b>9002</b>. Copialo e usalo nella tua WebView di Kodular per evitare errori di reindirizzamento.
                </p>
            </div>
        </CardContent>
        <CardFooter>
            <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('navbar.logout')}
            </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                {t('settings.subscription_card_title')}
            </CardTitle>
            <CardDescription>{t('settings.subscription_card_description')}</CardDescription>
        </CardHeader>
        <CardContent>
            {isSubscriptionLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('settings.loading_subscription')}
                </div>
            ) : hasActiveSubscription && subscription ? (
                 <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('settings.current_plan')}</span>
                        <span className="font-semibold capitalize">{getPlanName(subscription.subscriptionPlan)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('settings.status')}</span>
                        <span className="font-semibold capitalize">{t(`settings.plan_status_${subscription.subscriptionStatus}`)}</span>
                    </div>
                    {subscription.subscriptionPeriodEndDate && (
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">
                                {subscription.subscriptionStatus === 'trialing' ? t('settings.trial_ends_in_label') : t('settings.renews_on_label')}
                            </span>
                            <span className="font-semibold">{new Date(subscription.subscriptionPeriodEndDate).toLocaleDateString(language)}</span>
                        </div>
                    )}
                    {subscription.subscriptionPeriodEndDate && remainingDays >= 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{t('settings.days_remaining_label')}</span>
                            <span className="font-semibold">{t('settings.days_remaining_value', { count: remainingDays })}</span>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">{t('settings.no_active_subscription')}</p>
            )}
        </CardContent>
        <CardFooter>
             {isSubscriptionLoading ? null : hasActiveSubscription ? (
                <Button onClick={handleManageSubscription} disabled={isPortalLoading}>
                  {isPortalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  {t('settings.manage_subscription_button')}
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/pricing">{t('settings.view_plans_button')}</Link>
                </Button>
              )}
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SunMoon className="h-5 w-5" />
            {t('settings.theme_title')}
          </CardTitle>
          <CardDescription>{t('settings.theme_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>{t('settings.preferences_title')}</CardTitle>
            <CardDescription>{t('settings.preferences_description')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="language">{t('settings.language_label')}</Label>
                <Select value={language} onValueChange={(value) => setLanguage(value as 'it' | 'en' | 'fr' | 'de' | 'es')}>
                    <SelectTrigger id="language">
                        <SelectValue placeholder={t('settings.language_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="it">Italiano</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="currency">{t('settings.currency_label')}</Label>
                <Select value={currency.code} onValueChange={(value) => setCurrency(value as 'EUR' | 'USD')}>
                    <SelectTrigger id="currency">
                        <SelectValue placeholder={t('settings.currency_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(currencies).map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.name} ({c.symbol})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
        <CardFooter>
            <Button>{t('settings.save_preferences_button')}</Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive">
          <CardHeader>
              <CardTitle className="text-destructive">{t('settings.danger_zone_title')}</CardTitle>
              <CardDescription>{t('settings.danger_zone_description')}</CardDescription>
          </CardHeader>
          <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">{t('settings.empty_inventory_button')}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>{t('settings.alert_title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('settings.alert_description')}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>{t('settings.alert_cancel')}</AlertDialogCancel>
                    <AlertDialogAction>{t('settings.alert_continue')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardContent>
      </Card>
    </div>
  );
}
