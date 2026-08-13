'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextState {
  supabase: SupabaseClient;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setUser(session?.user ?? null);
      setUserError(error);
      setIsUserLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsUserLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ supabase, user, isUserLoading, userError }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuthContext(): AuthContextState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

/** Hook specifico per lo stato dell'utente autenticato. */
export function useUser() {
  const { user, isUserLoading, userError } = useAuthContext();
  return { user, isUserLoading, userError };
}

/** Hook per accedere al client Supabase (auth.signIn*, auth.signOut, ecc.). */
export function useAuth(): SupabaseClient {
  const { supabase } = useAuthContext();
  return supabase;
}
