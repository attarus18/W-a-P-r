'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useUser } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';

export type VariantMaterialType = 'wax' | 'wick';
export type SingleMaterialType = 'fragrance' | 'color';

// Cera e stoppino ammettono piu' varianti con prezzi diversi (es. "Soia" a
// 20€/kg e "Paraffina" a 8€/kg), scelte poi una per candela nel calcolatore.
// Fragranza e colore restano un solo prezzo per utente.
export interface MaterialVariant {
  id: string;
  name: string;
  unit: string;
  price: number;
}
export interface SingleMaterial {
  id: string;
  unit: string;
  price: number;
}

interface MaterialsContextType {
  waxVariants: MaterialVariant[];
  wickVariants: MaterialVariant[];
  fragrance?: SingleMaterial;
  color?: SingleMaterial;
  isLoading: boolean;
  saveVariants: (materialType: VariantMaterialType, variants: MaterialVariant[]) => Promise<void>;
  saveSingleMaterial: (materialType: SingleMaterialType, unit: string, price: number) => Promise<void>;
}

const MaterialsContext = createContext<MaterialsContextType | undefined>(undefined);

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export const MaterialsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [supabase] = useState(() => createClient());

  // Modalita' ospite: solo in memoria, persa al refresh (stesso pattern di
  // ricette/prodotti).
  const [localWax, setLocalWax] = useState<MaterialVariant[]>([]);
  const [localWick, setLocalWick] = useState<MaterialVariant[]>([]);
  const [localFragrance, setLocalFragrance] = useState<SingleMaterial | undefined>();
  const [localColor, setLocalColor] = useState<SingleMaterial | undefined>();

  const [remoteWax, setRemoteWax] = useState<MaterialVariant[]>([]);
  const [remoteWick, setRemoteWick] = useState<MaterialVariant[]>([]);
  const [remoteFragrance, setRemoteFragrance] = useState<SingleMaterial | undefined>();
  const [remoteColor, setRemoteColor] = useState<SingleMaterial | undefined>();

  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('materials').select('*').eq('user_id', user.id);
    const wax: MaterialVariant[] = [];
    const wick: MaterialVariant[] = [];
    let fragrance: SingleMaterial | undefined;
    let color: SingleMaterial | undefined;
    (data ?? []).forEach((row: any) => {
      if (row.material_type === 'wax') wax.push({ id: row.id, name: row.name ?? '', unit: row.unit, price: row.price });
      else if (row.material_type === 'wick') wick.push({ id: row.id, name: row.name ?? '', unit: row.unit, price: row.price });
      else if (row.material_type === 'fragrance') fragrance = { id: row.id, unit: row.unit, price: row.price };
      else if (row.material_type === 'color') color = { id: row.id, unit: row.unit, price: row.price };
    });
    setRemoteWax(wax);
    setRemoteWick(wick);
    setRemoteFragrance(fragrance);
    setRemoteColor(color);
  }, [supabase, user]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    refetch().finally(() => setIsLoading(false));
  }, [user, refetch]);

  const waxVariants = user ? remoteWax : localWax;
  const wickVariants = user ? remoteWick : localWick;
  const fragrance = user ? remoteFragrance : localFragrance;
  const color = user ? remoteColor : localColor;

  const saveVariants = useCallback(async (materialType: VariantMaterialType, variants: MaterialVariant[]) => {
    const withIds = variants.map((v) => ({ ...v, id: v.id || newId() }));

    if (user) {
      const current = materialType === 'wax' ? remoteWax : remoteWick;
      const nextIds = new Set(withIds.map((v) => v.id));
      const idsToDelete = current.filter((v) => !nextIds.has(v.id)).map((v) => v.id);

      if (idsToDelete.length > 0) {
        await supabase.from('materials').delete().in('id', idsToDelete);
      }
      if (withIds.length > 0) {
        await supabase.from('materials').upsert(
          withIds.map((v) => ({
            id: v.id,
            user_id: user.id,
            material_type: materialType,
            name: v.name,
            unit: v.unit,
            price: v.price,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'id' }
        );
      }
      await refetch();
    } else {
      if (materialType === 'wax') setLocalWax(withIds);
      else setLocalWick(withIds);
    }
  }, [user, supabase, refetch, remoteWax, remoteWick]);

  const saveSingleMaterial = useCallback(async (materialType: SingleMaterialType, unit: string, price: number) => {
    const existing = materialType === 'fragrance'
      ? (user ? remoteFragrance : localFragrance)
      : (user ? remoteColor : localColor);
    const id = existing?.id || newId();

    if (user) {
      await supabase.from('materials').upsert(
        {
          id,
          user_id: user.id,
          material_type: materialType,
          name: null,
          unit,
          price,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      await refetch();
    } else {
      if (materialType === 'fragrance') setLocalFragrance({ id, unit, price });
      else setLocalColor({ id, unit, price });
    }
  }, [user, supabase, refetch, remoteFragrance, remoteColor, localFragrance, localColor]);

  return (
    <MaterialsContext.Provider value={{ waxVariants, wickVariants, fragrance, color, isLoading, saveVariants, saveSingleMaterial }}>
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
