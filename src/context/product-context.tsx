'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { Product, Sale, Return, WithId } from '@/lib/data';
import { useUser } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';

interface ProductContextType {
  products: WithId<Product>[];
  addProduct: (product: Omit<Product, 'id' | 'timestamp' | 'userId'>) => void;
  updateProduct: (updatedProduct: WithId<Product>) => void;
  deleteProduct: (productId: string) => void;
  recordSale: (sale: Omit<Sale, 'id' | 'userId'>) => Promise<string | undefined>;
  deleteSale: (saleId: string) => void;
  recordReturn: (returnEntry: Omit<Return, 'id' | 'userId'>) => Promise<string | undefined>;
  isLoading: boolean;
}

interface SalesContextType {
  sales: WithId<Sale>[];
  isLoading: boolean;
}

interface ReturnsContextType {
  returns: WithId<Return>[];
  isLoading: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);
const SalesContext = createContext<SalesContextType | undefined>(undefined);
const ReturnsContext = createContext<ReturnsContextType | undefined>(undefined);

function rowToProduct(row: any): WithId<Product> {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    quantity: row.quantity,
    reorderThreshold: row.reorder_threshold,
    productionCost: row.production_cost,
    sellPrice: row.sell_price,
    timestamp: row.created_at,
  };
}

function rowToSale(row: any): WithId<Sale> {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    quantity: row.quantity,
    salePrice: row.sale_price,
    productionCost: row.production_cost,
    timestamp: row.created_at,
  };
}

function rowToReturn(row: any): WithId<Return> {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    quantity: row.quantity,
    timestamp: row.created_at,
  };
}

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [supabase] = useState(() => createClient());

  // Modalita' ospite (nessun utente autenticato): dati solo in memoria,
  // persi al refresh, esattamente come nella versione Firestore.
  const [localProducts, setLocalProducts] = useState<WithId<Product>[]>([]);

  const [remoteProducts, setRemoteProducts] = useState<WithId<Product>[]>([]);
  const [remoteSales, setRemoteSales] = useState<WithId<Sale>[]>([]);
  const [remoteReturns, setRemoteReturns] = useState<WithId<Return>[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [returnsLoading, setReturnsLoading] = useState(true);

  const refetchProducts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');
    setRemoteProducts((data ?? []).map(rowToProduct));
  }, [supabase, user]);

  const refetchSales = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');
    setRemoteSales((data ?? []).map(rowToSale));
  }, [supabase, user]);

  const refetchReturns = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('returns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');
    setRemoteReturns((data ?? []).map(rowToReturn));
  }, [supabase, user]);

  useEffect(() => {
    if (!user) {
      setProductsLoading(false);
      setSalesLoading(false);
      setReturnsLoading(false);
      return;
    }
    setProductsLoading(true);
    setSalesLoading(true);
    setReturnsLoading(true);
    Promise.all([refetchProducts(), refetchSales(), refetchReturns()]).finally(() => {
      setProductsLoading(false);
      setSalesLoading(false);
      setReturnsLoading(false);
    });
  }, [user, refetchProducts, refetchSales, refetchReturns]);

  const products = user ? remoteProducts : localProducts;
  const sales = user ? remoteSales : [];
  const returns = user ? remoteReturns : [];

  const addProduct = useCallback((newProduct: Omit<Product, 'id' | 'timestamp' | 'userId'>) => {
    if (user) {
      supabase.from('products').insert({
        user_id: user.id,
        name: newProduct.name,
        quantity: newProduct.quantity,
        reorder_threshold: newProduct.reorderThreshold,
        production_cost: newProduct.productionCost,
        sell_price: newProduct.sellPrice,
      }).then(() => refetchProducts());
    } else {
      const productToAdd: WithId<Product> = {
        ...newProduct,
        id: `prod_${Date.now()}`,
        userId: '',
        timestamp: new Date().toISOString(),
      };
      setLocalProducts(prev => [...prev, productToAdd]);
    }
  }, [user, supabase, refetchProducts]);

  const updateProduct = useCallback((updatedProduct: WithId<Product>) => {
    if (user) {
      supabase.from('products').update({
        name: updatedProduct.name,
        quantity: updatedProduct.quantity,
        reorder_threshold: updatedProduct.reorderThreshold,
        production_cost: updatedProduct.productionCost,
        sell_price: updatedProduct.sellPrice,
      }).eq('id', updatedProduct.id).then(() => refetchProducts());
    } else {
      setLocalProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    }
  }, [user, supabase, refetchProducts]);

  const deleteProduct = useCallback((productId: string) => {
    if (user) {
      supabase.from('products').delete().eq('id', productId).then(() => refetchProducts());
    } else {
      setLocalProducts(prev => prev.filter(p => p.id !== productId));
    }
  }, [user, supabase, refetchProducts]);

  const recordSale = useCallback(async (newSale: Omit<Sale, 'id' | 'userId'>) => {
    if (user) {
      const { data } = await supabase.from('sales').insert({
        user_id: user.id,
        product_id: newSale.productId,
        quantity: newSale.quantity,
        sale_price: newSale.salePrice,
        production_cost: newSale.productionCost,
      }).select('id').single();
      refetchSales();
      return data?.id as string | undefined;
    }
    // Nessun-op per gli ospiti, come nella versione Firestore.
    return undefined;
  }, [user, supabase, refetchSales]);

  const deleteSale = useCallback((saleId: string) => {
    if (user) {
      supabase.from('sales').delete().eq('id', saleId).then(() => refetchSales());
    }
  }, [user, supabase, refetchSales]);

  const recordReturn = useCallback(async (newReturn: Omit<Return, 'id' | 'userId'>) => {
    if (user) {
      const { data } = await supabase.from('returns').insert({
        user_id: user.id,
        product_id: newReturn.productId,
        quantity: newReturn.quantity,
      }).select('id').single();
      refetchReturns();
      return data?.id as string | undefined;
    }
    // Nessun-op per gli ospiti, come per le vendite.
    return undefined;
  }, [user, supabase, refetchReturns]);

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, recordSale, deleteSale, recordReturn, isLoading: productsLoading }}>
        <SalesContext.Provider value={{ sales, isLoading: salesLoading }}>
            <ReturnsContext.Provider value={{ returns, isLoading: returnsLoading }}>
                {children}
            </ReturnsContext.Provider>
        </SalesContext.Provider>
    </ProductContext.Provider>
  );
};

export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

export const useSales = (): SalesContextType => {
    const context = useContext(SalesContext);
    if (context === undefined) {
        throw new Error('useSales must be used within a ProductProvider');
    }
    return context;
}

export const useReturns = (): ReturnsContextType => {
    const context = useContext(ReturnsContext);
    if (context === undefined) {
        throw new Error('useReturns must be used within a ProductProvider');
    }
    return context;
}
