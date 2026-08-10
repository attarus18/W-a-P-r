'use client';
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/data';

interface SubscriptionContextType {
  subscription: Pick<AppUser, 'subscriptionPlan' | 'subscriptionStatus' | 'subscriptionPeriodEndDate' | 'stripeCustomerId'> | null;
  isSubscriptionLoading: boolean;
  isPro: boolean;
  isTrialing: boolean;
  hasActiveSubscription: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);

    const { data: userData, isLoading: isUserDocLoading } = useDoc<AppUser>(userDocRef);

    const subscription = useMemo(() => userData ? {
        stripeCustomerId: userData.stripeCustomerId,
        subscriptionPlan: userData.subscriptionPlan,
        subscriptionStatus: userData.subscriptionStatus,
        subscriptionPeriodEndDate: userData.subscriptionPeriodEndDate,
    } : null, [userData]);

    const isPro = useMemo(() => subscription?.subscriptionStatus === 'active', [subscription]);
    const isTrialing = useMemo(() => subscription?.subscriptionStatus === 'trialing', [subscription]);
    const hasActiveSubscription = useMemo(() => isPro || isTrialing, [isPro, isTrialing]);

    const value = {
      subscription,
      isSubscriptionLoading: isUserLoading || isUserDocLoading,
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
