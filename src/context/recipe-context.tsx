'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { Recipe, WithId } from '@/lib/data';
import { useUser } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_WAX_TYPE, type WaxType } from '@/lib/wax-types';

interface RecipeContextType {
  recipes: WithId<Recipe>[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'timestamp' | 'userId'>) => void;
  updateRecipe: (updatedRecipe: WithId<Recipe>) => void;
  deleteRecipe: (recipeId: string) => void;
  isLoading: boolean;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

function rowToRecipe(row: any): WithId<Recipe> {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    totalWeight: row.total_weight,
    unit: row.unit,
    waxType: (row.wax_type as WaxType) ?? DEFAULT_WAX_TYPE,
    fragrancePct: row.fragrance_pct,
    colorPct: row.color_pct,
    waxAmount: row.wax_amount,
    fragranceAmount: row.fragrance_amount,
    colorAmount: row.color_amount,
    notes: row.notes ?? undefined,
    timestamp: row.created_at,
  };
}

export const RecipeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [supabase] = useState(() => createClient());

  // Modalita' ospite (nessun utente autenticato): dati solo in memoria,
  // persi al refresh, esattamente come nella versione Firestore dei prodotti.
  const [localRecipes, setLocalRecipes] = useState<WithId<Recipe>[]>([]);

  const [remoteRecipes, setRemoteRecipes] = useState<WithId<Recipe>[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);

  const refetchRecipes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');
    setRemoteRecipes((data ?? []).map(rowToRecipe));
  }, [supabase, user]);

  useEffect(() => {
    if (!user) {
      setRecipesLoading(false);
      return;
    }
    setRecipesLoading(true);
    refetchRecipes().finally(() => setRecipesLoading(false));
  }, [user, refetchRecipes]);

  const recipes = user ? remoteRecipes : localRecipes;

  const addRecipe = useCallback((newRecipe: Omit<Recipe, 'id' | 'timestamp' | 'userId'>) => {
    if (user) {
      supabase.from('recipes').insert({
        user_id: user.id,
        name: newRecipe.name,
        total_weight: newRecipe.totalWeight,
        unit: newRecipe.unit,
        wax_type: newRecipe.waxType,
        fragrance_pct: newRecipe.fragrancePct,
        color_pct: newRecipe.colorPct,
        wax_amount: newRecipe.waxAmount,
        fragrance_amount: newRecipe.fragranceAmount,
        color_amount: newRecipe.colorAmount,
        notes: newRecipe.notes ?? null,
      }).then(() => refetchRecipes());
    } else {
      const recipeToAdd: WithId<Recipe> = {
        ...newRecipe,
        id: `recipe_${Date.now()}`,
        userId: '',
        timestamp: new Date().toISOString(),
      };
      setLocalRecipes(prev => [...prev, recipeToAdd]);
    }
  }, [user, supabase, refetchRecipes]);

  const updateRecipe = useCallback((updatedRecipe: WithId<Recipe>) => {
    if (user) {
      supabase.from('recipes').update({
        name: updatedRecipe.name,
        total_weight: updatedRecipe.totalWeight,
        unit: updatedRecipe.unit,
        wax_type: updatedRecipe.waxType,
        fragrance_pct: updatedRecipe.fragrancePct,
        color_pct: updatedRecipe.colorPct,
        wax_amount: updatedRecipe.waxAmount,
        fragrance_amount: updatedRecipe.fragranceAmount,
        color_amount: updatedRecipe.colorAmount,
        notes: updatedRecipe.notes ?? null,
      }).eq('id', updatedRecipe.id).then(() => refetchRecipes());
    } else {
      setLocalRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
    }
  }, [user, supabase, refetchRecipes]);

  const deleteRecipe = useCallback((recipeId: string) => {
    if (user) {
      supabase.from('recipes').delete().eq('id', recipeId).then(() => refetchRecipes());
    } else {
      setLocalRecipes(prev => prev.filter(r => r.id !== recipeId));
    }
  }, [user, supabase, refetchRecipes]);

  return (
    <RecipeContext.Provider value={{ recipes, addRecipe, updateRecipe, deleteRecipe, isLoading: recipesLoading }}>
        {children}
    </RecipeContext.Provider>
  );
};

export const useRecipes = (): RecipeContextType => {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
};
