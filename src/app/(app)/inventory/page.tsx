'use client';

import { useState } from 'react';
import ProductCard from '@/components/inventory/product-card';
import type { Product } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { PlusCircle, ShoppingCart, Loader2, Printer } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import AddProductDialog from '@/components/inventory/add-product-dialog';
import { useProducts } from '@/context/product-context';
import { useSubscription } from '@/context/subscription-context';
import { useCurrency } from '@/context/currency-context';
import { useToast } from '@/hooks/use-toast';
import { FREE_PRODUCT_LIMIT } from '@/lib/constants';
import jsPDF from 'jspdf';
import { savePdf, getPdfLogoDataUrl } from '@/lib/pdf-utils';

export default function InventoryPage() {
  const { t } = useLanguage();
  const { products, addProduct, isLoading: productsLoading } = useProducts();
  const { subscription, isSubscriptionLoading, hasActiveSubscription, isTrialing } = useSubscription();
  const { formatCurrency } = useCurrency();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
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
  
  const handleGeneratePdf = async () => {
    if (products.length === 0) return;
    setIsPrinting(true);
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;
      const margin = 30;
      const maxY = doc.internal.pageSize.height - margin;
      let y = margin;

      const primaryColor = '#f97316';
      const textColor = '#111827';
      const mutedColor = '#6b7280';
      const stripeColor = '#f3f4f6';
      const rowHeight = 18;

      const drawHeader = async () => {
        const logoSize = 34;
        const logoDataUrl = await getPdfLogoDataUrl();
        const titleX = logoDataUrl ? margin + logoSize + 12 : margin;
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, 'PNG', margin, y, logoSize, logoSize);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(30);
        doc.setTextColor(primaryColor);
        doc.text('WAX PRO', titleX, y + 20, { charSpace: 2 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(mutedColor);
        doc.text(t('inventory.title').toUpperCase(), titleX, y + 32, { charSpace: 1 });
        y += logoSize + 20;
      };

      const ensureSpace = async (needed: number) => {
        if (y + needed > maxY) {
          doc.addPage();
          y = margin;
          await drawHeader();
        }
      };

      await drawHeader();

      for (const product of products) {
        await ensureSpace(18 + rowHeight * 4 + 18);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(textColor);
        doc.text(product.name, margin, y);
        y += 18;

        const details: [string, string][] = [
          [t('inventory.pdf_quantity_label'), String(product.quantity)],
          [t('inventory.pdf_reorder_label'), String(product.reorderThreshold)],
          [t('inventory.pdf_cost_label'), formatCurrency(product.productionCost)],
          [t('inventory.pdf_price_label'), formatCurrency(product.sellPrice)],
        ];
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        details.forEach(([label, value], rowIndex) => {
          if (rowIndex % 2 === 1) {
            doc.setFillColor(stripeColor);
            doc.rect(margin, y - rowHeight + 5, pageWidth - margin * 2, rowHeight, 'F');
          }
          doc.setTextColor(mutedColor);
          doc.text(`${label}:`, margin + 6, y);
          doc.setTextColor(textColor);
          doc.text(value, pageWidth - margin - 6, y, { align: 'right' });
          y += rowHeight;
        });

        y += 10;
        doc.setDrawColor('#d1d5db');
        doc.line(margin, y - 5, pageWidth - margin, y - 5);
        y += 8;
      }

      await savePdf(doc, 'waxpro-magazzino.pdf');
    } catch (error) {
      console.error('Error generating inventory PDF:', error);
      toast({
        variant: 'destructive',
        title: t('report.pdf_error_title'),
        description: t('report.pdf_error_description'),
      });
    } finally {
      setIsPrinting(false);
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
        <div className="flex items-center gap-2 flex-wrap">
          {products.length > 0 && (
            <Button variant="outline" onClick={handleGeneratePdf} disabled={isPrinting}>
              {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              {t('inventory.print_button')}
            </Button>
          )}
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

      {products.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleGeneratePdf} disabled={isPrinting}>
            {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            {t('inventory.print_button')}
          </Button>
        </div>
      )}
    </div>
  );
}

    