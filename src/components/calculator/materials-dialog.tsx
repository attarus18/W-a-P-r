'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Boxes, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useCurrency } from '@/context/currency-context';
import { useMaterials } from '@/context/materials-context';
import { useToast } from '@/hooks/use-toast';

interface MaterialsDialogProps {
  children: React.ReactNode;
}

export default function MaterialsDialog({ children }: MaterialsDialogProps) {
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { materials, saveMaterials } = useMaterials();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [waxPrice, setWaxPrice] = useState('0');
  const [waxUnit, setWaxUnit] = useState<'kg' | 'lb'>('kg');
  const [wickPrice, setWickPrice] = useState('0');
  const [fragrancePrice, setFragrancePrice] = useState('0');
  const [fragranceUnit, setFragranceUnit] = useState<'ml' | 'l' | 'fl_oz'>('ml');

  useEffect(() => {
    if (!open) return;
    setWaxPrice(String(materials.wax?.price ?? 0));
    setWaxUnit((materials.wax?.unit as 'kg' | 'lb') ?? 'kg');
    setWickPrice(String(materials.wick?.price ?? 0));
    setFragrancePrice(String(materials.fragrance?.price ?? 0));
    setFragranceUnit((materials.fragrance?.unit as 'ml' | 'l' | 'fl_oz') ?? 'ml');
  }, [open, materials]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMaterials([
        { materialType: 'wax', unit: waxUnit, price: parseFloat(waxPrice) || 0 },
        { materialType: 'wick', unit: 'piece', price: parseFloat(wickPrice) || 0 },
        { materialType: 'fragrance', unit: fragranceUnit, price: parseFloat(fragrancePrice) || 0 },
      ]);
      toast({ title: t('materials.toast_saved_title') });
      setOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: t('materials.toast_error_title') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            {t('materials.dialog_title')}
          </DialogTitle>
          <DialogDescription>{t('materials.dialog_description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="wax-price">{t('materials.wax_label', { currency: currency.symbol })}</Label>
            <div className="flex gap-2">
              <Input
                id="wax-price"
                type="number"
                step="0.01"
                min="0"
                value={waxPrice}
                onChange={(e) => setWaxPrice(e.target.value)}
                className="flex-1 min-w-0"
              />
              <Select value={waxUnit} onValueChange={(v) => setWaxUnit(v as 'kg' | 'lb')}>
                <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">{t('materials.unit_kg')}</SelectItem>
                  <SelectItem value="lb">{t('materials.unit_lb')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wick-price">{t('materials.wick_label', { currency: currency.symbol })}</Label>
            <Input
              id="wick-price"
              type="number"
              step="0.01"
              min="0"
              value={wickPrice}
              onChange={(e) => setWickPrice(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fragrance-price">{t('materials.fragrance_label', { currency: currency.symbol })}</Label>
            <div className="flex gap-2">
              <Input
                id="fragrance-price"
                type="number"
                step="0.01"
                min="0"
                value={fragrancePrice}
                onChange={(e) => setFragrancePrice(e.target.value)}
                className="flex-1 min-w-0"
              />
              <Select value={fragranceUnit} onValueChange={(v) => setFragranceUnit(v as 'ml' | 'l' | 'fl_oz')}>
                <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ml">{t('materials.unit_ml')}</SelectItem>
                  <SelectItem value="l">{t('materials.unit_l')}</SelectItem>
                  <SelectItem value="fl_oz">{t('materials.unit_fl_oz')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">{t('settings.alert_cancel')}</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('materials.save_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
