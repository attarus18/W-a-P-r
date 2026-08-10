'use client';

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLanguage } from '@/context/language-context';
import type { Product } from '@/lib/data';

type EditProductFormValues = Omit<Product, 'id' | 'timestamp' | 'unitsSold' | 'unitsReturned' >;

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onUpdateProduct: (product: EditProductFormValues) => void;
}

export default function EditProductDialog({ open, onOpenChange, product, onUpdateProduct }: EditProductDialogProps) {
  const { t } = useLanguage();
  const form = useForm<EditProductFormValues>({
    defaultValues: product,
  });
  
  useEffect(() => {
    if (open) {
      form.reset(product);
    }
  }, [open, product, form]);

  const onSubmit: SubmitHandler<EditProductFormValues> = (data) => {
    onUpdateProduct({
        ...data,
        quantity: Number(data.quantity),
        reorderThreshold: Number(data.reorderThreshold),
        productionCost: Number(data.productionCost),
        sellPrice: Number(data.sellPrice),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('inventory.edit_product_title')}</DialogTitle>
          <DialogDescription>{t('inventory.edit_product_description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: t('inventory.name_required') }}
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('inventory.product_name_label')}</FormLabel>
                        <FormControl>
                        <Input placeholder={t('inventory.product_name_placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="quantity"
                        rules={{ required: true, min: 0 }}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('product_card.quantity')}</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="reorderThreshold"
                         rules={{ required: true, min: 0 }}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('product_card.reorder_threshold')}</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="productionCost"
                         rules={{ required: true, min: 0 }}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('product_card.cost')}</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.01" {...field} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="sellPrice"
                         rules={{ required: true, min: 0 }}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('product_card.price')}</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.01" {...field} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">{t('settings.alert_cancel')}</Button>
                    </DialogClose>
                    <Button type="submit">{t('inventory.save_changes_button')}</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
