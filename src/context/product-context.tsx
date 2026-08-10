'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import type { Product, Sale, WithId } from '@/lib/data';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';

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

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const firestore = useFirestore();
  const [localProducts, setLocalProducts] = useState<WithId<Product>[]>([]);

  const productsCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'products');
  }, [firestore, user]);

  const salesCollection = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return collection(firestore, 'users', user.uid, 'sales');
  }, [firestore, user]);

  const { data: firestoreProducts, isLoading: productsLoading } = useCollection<Product>(productsCollection);
  const { data: firestoreSales, isLoading: salesLoading } = useCollection<Sale>(salesCollection);

  const products = user ? firestoreProducts ?? [] : localProducts;
  const sales = user ? firestoreSales ?? [] : [];

  const addProduct = useCallback((newProduct: Omit<Product, 'id' | 'timestamp' | 'userId'>) => {
    if (user && productsCollection) {
      const productToAdd = {
        ...newProduct,
        userId: user.uid,
        timestamp: new Date().toISOString(),
      };
      addDocumentNonBlocking(productsCollection, productToAdd);
    } else {
      const productToAdd: WithId<Product> = {
        ...newProduct,
        id: `prod_${Date.now()}`,
        userId: '',
        timestamp: new Date().toISOString(),
      };
      setLocalProducts(prev => [...prev, productToAdd]);
    }
  }, [user, productsCollection]);

  const updateProduct = useCallback((updatedProduct: WithId<Product>) => {
    if (user && firestore) {
      const productRef = doc(firestore, 'users', user.uid, 'products', updatedProduct.id);
      const { id, ...productData } = updatedProduct;
      updateDocumentNonBlocking(productRef, productData);
    } else {
       setLocalProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    }
  }, [user, firestore]);

  const deleteProduct = useCallback((productId: string) => {
    if (user && firestore) {
        const productRef = doc(firestore, 'users', user.uid, 'products', productId);
        deleteDocumentNonBlocking(productRef);
    } else {
      setLocalProducts(prev => prev.filter(p => p.id !== productId));
    }
  }, [user, firestore]);

  const recordSale = useCallback((newSale: Omit<Sale, 'id' | 'userId'>) => {
      if (user && salesCollection) {
          const saleToAdd = {
              ...newSale,
              userId: user.uid,
          };
          addDocumentNonBlocking(salesCollection, saleToAdd);
      }
  }, [user, salesCollection]);

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
