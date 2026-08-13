'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { Product, Sale, WithId } from '@/lib/data';
import { useUser } from '@/context/auth-context';
import { createClient } from '@/lib/supabase/client';

interface ProductContextType {
  products: WithId<Product>[];
  addProduct: (product: Omit<Product, 'id' | 'timestamp' | 'userId'>) => void;
  updateProduct: (updatedProduct: WithId<Product>) => void;
  deleteProduct: (productId: string) => void;
  recordSale: (sale: Omit<Sale, 'id' | 'userId'>) => void;
  isLoading: boolean;
}

interface SalesContextType {
  sales: WithId<Sale>[];
  isLoading: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);
const SalesContext = createContext<SalesContextType | undefined>(undefined);

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

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [supabase] = useState(() => createClient());

  // Modalita' ospite (nessun utente autenticato): dati solo in memoria,
  // persi al refresh, esattamente come nella versione Firestore.
  const [localProducts, setLocalProducts] = useState<WithId<Product>[]>([]);

  const [remoteProducts, setRemoteProducts] = useState<WithId<Product>[]>([]);
  const [remoteSales, setRemoteSales] = useState<WithId<Sale>[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);

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

  useEffect(() => {
    if (!user) {
      setProductsLoading(false);
      setSalesLoading(false);
      return;
    }
    setProductsLoading(true);
    setSalesLoading(true);
    Promise.all([refetchProducts(), refetchSales()]).finally(() => {
      setProductsLoading(false);
      setSalesLoading(false);
    });
  }, [user, refetchProducts, refetchSales]);

  const products = user ? remoteProducts : localProducts;
  const sales = user ? remoteSales : [];

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

  const recordSale = useCallback((newSale: Omit<Sale, 'id' | 'userId'>) => {
    if (user) {
      supabase.from('sales').insert({
        user_id: user.id,
        product_id: newSale.productId,
        quantity: newSale.quantity,
        sale_price: newSale.salePrice,
        production_cost: newSale.productionCost,
      }).then(() => refetchSales());
    }
    // Nessun-op per gli ospiti, come nella versione Firestore.
  }, [user, supabase, refetchSales]);

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, recordSale, isLoading: productsLoading }}>
        <SalesContext.Provider value={{ sales, isLoading: salesLoading }}>
            {children}
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
