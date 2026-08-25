'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Bell, Minus, Plus, MoreVertical, Pencil, Trash2, BarChart2, Truck, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/language-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditProductDialog from './edit-product-dialog';
import { useCurrency } from '@/context/currency-context';
import { useProducts } from '@/context/product-context';
import { useUser } from '@/context/auth-context';

interface ProductCardProps {
  product: Product;
}

type UndoEntry = {
  type: 'sell' | 'load' | 'return';
  previousQuantity: number;
  saleId?: string;
};

// Numero massimo di azioni annullabili in sequenza per singolo prodotto.
const MAX_UNDO_HISTORY = 20;

export default function ProductCard({ product }: ProductCardProps) {
  const { updateProduct, deleteProduct, recordSale, deleteSale, recordReturn } = useProducts();
  const { user } = useUser();
  const [quantity, setQuantity] = useState(product.quantity);
  const [loadAmount, setLoadAmount] = useState(1);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [undoHistory, setUndoHistory] = useState<UndoEntry[]>([]);
  const isLowStock = quantity <= product.reorderThreshold;
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();

  // Lo storico è legato a utente + prodotto, cosi' sopravvive ai refresh
  // ma non si mescola tra account diversi sullo stesso dispositivo.
  const undoStorageKey = `waxpro_undo_${user?.id ?? 'guest'}_${product.id}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(undoStorageKey);
      setUndoHistory(stored ? JSON.parse(stored) : []);
    } catch {
      setUndoHistory([]);
    }
  }, [undoStorageKey]);

  const pushUndoEntry = (entry: UndoEntry) => {
    setUndoHistory(prev => {
      const next = [...prev, entry].slice(-MAX_UNDO_HISTORY);
      localStorage.setItem(undoStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const clearUndoHistory = () => {
    setUndoHistory([]);
    localStorage.removeItem(undoStorageKey);
  };

  const handleSell = async () => {
    if (quantity > 0) {
      const previousQuantity = quantity;
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);

      const updatedProduct = { ...product, quantity: newQuantity };
      updateProduct(updatedProduct);

      const saleId = await recordSale({
        productId: product.id,
        quantity: 1,
        salePrice: product.sellPrice,
        productionCost: product.productionCost,
        timestamp: new Date().toISOString(),
      });

      pushUndoEntry({ type: 'sell', previousQuantity, saleId });
    }
  };

  const handleLoad = () => {
    const previousQuantity = quantity;
    const newQuantity = quantity + Number(loadAmount);
    setQuantity(newQuantity);
    updateProduct({ ...product, quantity: newQuantity });
    pushUndoEntry({ type: 'load', previousQuantity });
    setLoadAmount(1);
  };

  const handleReturn = () => {
    const previousQuantity = quantity;
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    updateProduct({ ...product, quantity: newQuantity });
    recordReturn({ productId: product.id, quantity: 1, timestamp: new Date().toISOString() });
    pushUndoEntry({ type: 'return', previousQuantity });
  };

  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    const entry = undoHistory[undoHistory.length - 1];

    setQuantity(entry.previousQuantity);
    updateProduct({ ...product, quantity: entry.previousQuantity });
    if (entry.type === 'sell' && entry.saleId) {
      deleteSale(entry.saleId);
    }

    setUndoHistory(prev => {
      const next = prev.slice(0, -1);
      localStorage.setItem(undoStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const handleUpdate = (updatedValues: Omit<Product, 'id' | 'timestamp' >) => {
    const updatedProduct = { ...product, ...updatedValues };
    updateProduct(updatedProduct);
    if(updatedValues.quantity) {
        setQuantity(updatedValues.quantity)
    }
    // Una modifica manuale rompe la catena delle quantita' precedenti:
    // lo storico di undo non sarebbe piu' affidabile.
    clearUndoHistory();
    setIsEditDialogOpen(false);
  }

  return (
    <Card className={cn('flex flex-col transition-all hover:shadow-lg hover:shadow-primary/10', isLowStock && 'border-destructive/50')}>
      <CardHeader className="relative p-4 flex-row items-start justify-between">
        <div>
            <CardTitle className="text-lg">{product.name}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
            {isLowStock && (
            <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                <Bell className="h-4 w-4" />
            </div>
            )}
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleUndo}
                disabled={undoHistory.length === 0}
                title={undoHistory.length > 0 ? `${t('product_card.undo_button')} (${undoHistory.length})` : t('product_card.undo_button')}
            >
                <Undo2 className="h-4 w-4" />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onSelect={(e) => {
                            e.preventDefault();
                            setTimeout(() => setIsEditDialogOpen(true), 0);
                        }}
                    >
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>{t('product_card.edit_button')}</span>
                    </DropdownMenuItem>
                     <DropdownMenuItem>
                        <BarChart2 className="mr-2 h-4 w-4" />
                        <span>{t('product_card.stats_button')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>{t('product_card.delete_button')}</span>
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>{t('product_card.delete_alert_title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                               {t('product_card.delete_alert_description')}
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>{t('settings.alert_cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { clearUndoHistory(); deleteProduct(product.id); }} className={cn(buttonVariants({ variant: "destructive" }))}>{t('product_card.delete_button')}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
            <EditProductDialog 
                open={isEditDialogOpen} 
                onOpenChange={setIsEditDialogOpen} 
                product={product} 
                onUpdateProduct={handleUpdate} 
            />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{t('product_card.quantity')}:</span>
          <span className={cn('font-bold', isLowStock && 'text-destructive')}>{quantity}</span>
        </div>
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>{t('product_card.reorder_threshold')}:</span>
          <span>{product.reorderThreshold}</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="text-muted-foreground">{t('product_card.cost')}:</span>
          <span className="font-semibold">{formatCurrency(product.productionCost)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{t('product_card.price')}:</span>
          <span className="font-semibold">{formatCurrency(product.sellPrice)}</span>
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-3 gap-2 p-4 pt-0">
        <Button variant="default" size="sm" onClick={handleSell} disabled={quantity === 0}>
            <Truck className="h-4 w-4" />
        </Button>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="default" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-1 sm:hidden" />
                <span className="hidden sm:inline">{t('product_card.load_button')}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('product_card.load_dialog_title')}</DialogTitle>
              <DialogDescription>
                {t('product_card.load_dialog_description')} {product.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="load-amount" className="text-right">
                  {t('product_card.quantity_label')}
                </Label>
                <Input
                  id="load-amount"
                  type="number"
                  value={loadAmount}
                  onChange={(e) => setLoadAmount(parseInt(e.target.value, 10))}
                  className="col-span-3"
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="submit" onClick={handleLoad}>{t('product_card.add_button')}</Button>
                </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Button variant="default" size="sm" onClick={handleReturn}>{t('product_card.return_button')}</Button>
      </CardFooter>
    </Card>
  );
}
