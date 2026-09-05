'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useUser } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';

export type MaterialType = 'wax' | 'wick' | 'fragrance';

export interface MaterialPrice {
  materialType: MaterialType;
  unit: string;
  price: number;
}

interface MaterialsContextType {
  materials: Partial<Record<MaterialType, MaterialPrice>>;
  isLoading: boolean;
  saveMaterials: (values: MaterialPrice[]) => Promise<void>;
}

const MaterialsContext = createContext<MaterialsContextType | undefined>(undefined);

function rowToMaterial(row: any): MaterialPrice {
  return { materialType: row.material_type, unit: row.unit, price: row.price };
}

export const MaterialsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [supabase] = useState(() => createClient());

  // Modalita' ospite: solo in memoria, persa al refresh (stesso pattern di
  // ricette/prodotti).
  const [localMaterials, setLocalMaterials] = useState<Partial<Record<MaterialType, MaterialPrice>>>({});
  const [remoteMaterials, setRemoteMaterials] = useState<Partial<Record<MaterialType, MaterialPrice>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('materials').select('*').eq('user_id', user.id);
    const map: Partial<Record<MaterialType, MaterialPrice>> = {};
    (data ?? []).forEach((row: any) => {
      map[row.material_type as MaterialType] = rowToMaterial(row);
    });
    setRemoteMaterials(map);
  }, [supabase, user]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    refetch().finally(() => setIsLoading(false));
  }, [user, refetch]);

  const materials = user ? remoteMaterials : localMaterials;

  const saveMaterials = useCallback(async (values: MaterialPrice[]) => {
    if (user) {
      await supabase.from('materials').upsert(
        values.map((v) => ({
          user_id: user.id,
          material_type: v.materialType,
          unit: v.unit,
          price: v.price,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,material_type' }
      );
      await refetch();
    } else {
      setLocalMaterials((prev) => {
        const next = { ...prev };
        values.forEach((v) => {
          next[v.materialType] = v;
        });
        return next;
      });
    }
  }, [user, supabase, refetch]);

  return (
    <MaterialsContext.Provider value={{ materials, isLoading, saveMaterials }}>
      {children}
    </MaterialsContext.Provider>
  );
};

export const useMaterials = (): MaterialsContextType => {
  const context = useContext(MaterialsContext);
  if (context === undefined) {
    throw new Error('useMaterials must be used within a MaterialsProvider');
  }
  return context;
};
