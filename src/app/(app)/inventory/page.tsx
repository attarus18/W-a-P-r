'use client';

import { useState } from 'react';
import ProductCard from '@/components/inventory/product-card';
import type { Product } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import AddProductDialog from '@/components/inventory/add-product-dialog';
import { useProducts } from '@/context/product-context';
import { useSubscription } from '@/context/subscription-context';
import { useToast } from '@/hooks/use-toast';
import { FREE_PRODUCT_LIMIT } from '@/lib/constants';

export default function InventoryPage() {
  const { t } = useLanguage();
  const { products, addProduct, isLoading: productsLoading } = useProducts();
  const { subscription, isSubscriptionLoading, hasActiveSubscription, isTrialing } = useSubscription();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const getProductLimit = () => {
    if (isTrialing) return 5;
    if (subscription?.subscriptionPlan === 'hobby') return 50;
    if (subscription?.subscriptionPlan === 'pro') return 100;
    if (subscription?.subscriptionPlan === 'annual') return 120;
    return FREE_PRODUCT_LIMIT;
  };
  
  const productLimit = getProductLimit();
  const atLimit = products.length >= productLimit;

  const handleAddProductClick = () => {
    if (atLimit) {
      toast({
        variant: 'destructive',
        title: t('inventory.limit_reached_title'),
        description: t('inventory.limit_reached_desc', { limit: productLimit }),
      });
    } else {
      setIsAddDialogOpen(true);
    }
  };

  const handleAddProduct = (newProduct: Omit<Product, 'id' | 'timestamp' | 'unitsSold' | 'unitsReturned' | 'userId'>) => {
    if (!atLimit) {
      addProduct(newProduct);
      setIsAddDialogOpen(false);
    } else {
       toast({
        variant: 'destructive',
        title: t('inventory.limit_reached_title'),
        description: t('inventory.limit_reached_desc', { limit: productLimit }),
      });
    }
  };
  
  if (isSubscriptionLoading || productsLoading) {
    return (
        <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('inventory.title')}</h1>
          <p className="text-muted-foreground">{t('inventory.description')}</p>
          <p className="text-sm text-primary font-medium mt-1">
            {hasActiveSubscription
              ? t('inventory.product_count', { count: products.length, limit: productLimit })
              : t('inventory.product_count_free', { count: products.length, limit: productLimit })}
          </p>
        </div>
        <AddProductDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen} 
          onAddProduct={handleAddProduct}
        >
          <Button onClick={handleAddProductClick} disabled={atLimit}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('inventory.add_product_button')}
          </Button>
        </AddProductDialog>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-lg border-2 border-dashed border-border">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">{t('inventory.empty_title')}</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{t('inventory.empty_description')}</p>
            <AddProductDialog 
              open={isAddDialogOpen} 
              onOpenChange={setIsAddDialogOpen} 
              onAddProduct={handleAddProduct}
            >
              <Button onClick={handleAddProductClick}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t('inventory.add_first_product_button')}
              </Button>
            </AddProductDialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

    