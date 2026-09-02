'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useUser } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import type { User as AppUser } from '@/lib/data';

// Google Play non espone uno stato "in prova" dedicato: durante i 7 giorni
// gratuiti riporta comunque SUBSCRIPTION_STATE_ACTIVE. "In prova" e' quindi
// calcolato qui, confrontando subscriptionStartedAt (impostato una sola
// volta, alla prima sincronizzazione dell'acquisto) con la durata nota
// della prova pubblicizzata in app (vedi pricing.trial_note).
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface SubscriptionContextType {
  subscription: Pick<AppUser, 'subscriptionPlan' | 'subscriptionStatus' | 'subscriptionPeriodEndDate' | 'subscriptionStartedAt'> | null;
  isSubscriptionLoading: boolean;
  isPro: boolean;
  isTrialing: boolean;
  hasActiveSubscription: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
    const { user, isUserLoading } = useUser();
    const [supabase] = useState(() => createClient());
    const [profileRow, setProfileRow] = useState<any>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setProfileRow(null);
            setIsProfileLoading(false);
            return;
        }
        setIsProfileLoading(true);
        supabase
            .from('profiles')
            .select('subscription_plan, subscription_status, subscription_period_end_date, subscription_started_at')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                setProfileRow(data);
                setIsProfileLoading(false);
            });
    }, [supabase, user]);

    const subscription = useMemo(() => profileRow ? {
        subscriptionPlan: profileRow.subscription_plan,
        subscriptionStatus: profileRow.subscription_status,
        subscriptionPeriodEndDate: profileRow.subscription_period_end_date,
        subscriptionStartedAt: profileRow.subscription_started_at,
    } : null, [profileRow]);

    const isPro = useMemo(() => subscription?.subscriptionStatus === 'active', [subscription]);
    const isTrialing = useMemo(() => {
        if (!isPro || !subscription?.subscriptionStartedAt) return false;
        return Date.now() - new Date(subscription.subscriptionStartedAt).getTime() < TRIAL_DURATION_MS;
    }, [isPro, subscription]);
    // In grace period Google raccomanda di mantenere l'accesso: l'utente ha
    // solo un problema di pagamento temporaneo, non ha ancora perso l'abbonamento.
    const isInGracePeriod = useMemo(() => subscription?.subscriptionStatus === 'grace_period', [subscription]);
    const hasActiveSubscription = useMemo(() => isPro || isTrialing || isInGracePeriod, [isPro, isTrialing, isInGracePeriod]);

    const value = {
      subscription,
      isSubscriptionLoading: isUserLoading || isProfileLoading,
      isPro,
      isTrialing,
      hasActiveSubscription,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export const useSubscription = (): SubscriptionContextType => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}
