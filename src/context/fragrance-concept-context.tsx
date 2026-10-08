'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useUser } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';

export interface FragranceComponent {
  name: string;
  percentage: number;
}

export interface SavedFragranceConcept {
  id: string;
  userId: string;
  concept: string;
  title: string;
  description: string;
  topNote: string;
  heartNote: string;
  baseNote: string;
  fragrances: FragranceComponent[];
  createdAt: string;
}

export type NewFragranceConcept = Omit<SavedFragranceConcept, 'id' | 'userId' | 'createdAt'>;

interface FragranceConceptContextType {
  savedConcepts: SavedFragranceConcept[];
  addSavedConcept: (concept: NewFragranceConcept) => Promise<{ error: string | null }>;
  deleteSavedConcept: (id: string) => Promise<{ error: string | null }>;
  isLoading: boolean;
}

const FragranceConceptContext = createContext<FragranceConceptContextType | undefined>(undefined);

function rowToSavedConcept(row: any): SavedFragranceConcept {
  return {
    id: row.id,
    userId: row.user_id,
    concept: row.concept,
    title: row.title,
    description: row.description,
    topNote: row.top_note,
    heartNote: row.heart_note,
    baseNote: row.base_note,
    fragrances: Array.isArray(row.fragrances) ? row.fragrances : [],
    createdAt: row.created_at,
  };
}

export const FragranceConceptProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [supabase] = useState(() => createClient());

  const [savedConcepts, setSavedConcepts] = useState<SavedFragranceConcept[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('fragrance_concepts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSavedConcepts((data ?? []).map(rowToSavedConcept));
  }, [supabase, user]);

  useEffect(() => {
    if (!user) {
      setSavedConcepts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    refetch().finally(() => setIsLoading(false));
  }, [user, refetch]);

  // Nessuna modalita' ospite (a differenza di prodotti/ricette): il
  // Suggeritore AI richiede comunque un account (abbonamento o video con
  // ricompensa), quindi qui user e' sempre presente quando si chiama addSavedConcept.
  const addSavedConcept = useCallback(
    async (newConcept: NewFragranceConcept) => {
      if (!user) return { error: 'Devi effettuare l\'accesso.' };
      const { error } = await supabase.from('fragrance_concepts').insert({
        user_id: user.id,
        concept: newConcept.concept,
        title: newConcept.title,
        description: newConcept.description,
        top_note: newConcept.topNote,
        heart_note: newConcept.heartNote,
        base_note: newConcept.baseNote,
        fragrances: newConcept.fragrances,
      });
      if (error) return { error: error.message };
      await refetch();
      return { error: null };
    },
    [user, supabase, refetch]
  );

  const deleteSavedConcept = useCallback(
    async (id: string) => {
      if (!user) return { error: 'Devi effettuare l\'accesso.' };
      const { error } = await supabase.from('fragrance_concepts').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetch();
      return { error: null };
    },
    [user, supabase, refetch]
  );

  return (
    <FragranceConceptContext.Provider value={{ savedConcepts, addSavedConcept, deleteSavedConcept, isLoading }}>
      {children}
    </FragranceConceptContext.Provider>
  );
};

export const useFragranceConcepts = (): FragranceConceptContextType => {
  const context = useContext(FragranceConceptContext);
  if (context === undefined) {
    throw new Error('useFragranceConcepts must be used within a FragranceConceptProvider');
  }
  return context;
};
