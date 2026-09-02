'use client';

import { useState } from 'react';
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
import { User as UserIcon, LogOut, Loader2, Star, CreditCard, SunMoon, Settings, Trash2, LifeBuoy } from "lucide-react";
import { useUser, useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import AccessDenied from "@/components/auth/access-denied";
import { useSubscription } from "@/context/subscription-context";
import { differenceInDays } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { NativePurchases } from '@capgo/native-purchases';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ThemeToggle } from '@/components/settings/theme-toggle';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency, currencies } = useCurrency();
  const { user } = useUser();
  const supabase = useAuth();
  const router = useRouter();
  const { subscription, hasActiveSubscription, isSubscriptionLoading } = useSubscription();
  const { toast } = useToast();
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isEmptyingInventory, setIsEmptyingInventory] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const callAccountApi = async (path: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || t('settings.danger_zone_generic_error'));
    }
  };

  const handleEmptyInventory = async () => {
    setIsEmptyingInventory(true);
    try {
      await callAccountApi('/api/account/empty-inventory');
      toast({ title: t('settings.empty_inventory_success') });
      window.location.reload();
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('settings.empty_inventory_error'), description: error.message });
      setIsEmptyingInventory(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await callAccountApi('/api/account/delete-everything');
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('settings.delete_account_error'), description: error.message });
      setIsDeletingAccount(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!Capacitor.isNativePlatform()) {
        return;
    }
    setIsPortalLoading(true);
    try {
        await NativePurchases.manageSubscriptions();
    } catch (error: any) {
        toast({ variant: 'destructive', title: t('settings.play_management_error'), description: error.message });
    } finally {
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
          {user && <CardDescription>{t('settings.logged_in_as', { email: user.email ?? '' })}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="email">{t('settings.email_label')}</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled />
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5" />
            {t('support.title')}
          </CardTitle>
          <CardDescription>{t('support.description')}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link href="/support">{t('support.settings_button')}</Link>
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive">
          <CardHeader>
              <CardTitle className="text-destructive">{t('settings.danger_zone_title')}</CardTitle>
              <CardDescription>{t('settings.danger_zone_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    <AlertDialogCancel disabled={isEmptyingInventory}>{t('settings.alert_cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEmptyInventory} disabled={isEmptyingInventory}>
                        {isEmptyingInventory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('settings.alert_continue')}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="border-t pt-4">
              <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirmText(''); }}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('settings.delete_account_button')}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>{t('settings.delete_account_title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('settings.delete_account_description')}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="delete-account-confirm">
                            {t('settings.delete_account_confirm_label', { word: t('settings.delete_account_confirm_word') })}
                        </Label>
                        <Input
                            id="delete-account-confirm"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            autoComplete="off"
                        />
                    </div>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingAccount}>{t('settings.alert_cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount || deleteConfirmText !== t('settings.delete_account_confirm_word')}
                    >
                        {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('settings.alert_continue')}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
      </Card>
    </div>
  );
}
