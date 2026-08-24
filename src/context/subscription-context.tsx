'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useUser } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import type { User as AppUser } from '@/lib/data';

interface SubscriptionContextType {
  subscription: Pick<AppUser, 'subscriptionPlan' | 'subscriptionStatus' | 'subscriptionPeriodEndDate'> | null;
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
            .select('subscription_plan, subscription_status, subscription_period_end_date')
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
    } : null, [profileRow]);

    const isPro = useMemo(() => subscription?.subscriptionStatus === 'active', [subscription]);
    const isTrialing = useMemo(() => subscription?.subscriptionStatus === 'trialing', [subscription]);
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
