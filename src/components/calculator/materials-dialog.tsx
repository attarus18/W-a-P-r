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
import { Boxes, Loader2, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useCurrency } from '@/context/currency-context';
import { useMaterials, type MaterialVariant } from '@/context/materials-context';
import { useToast } from '@/hooks/use-toast';

interface MaterialsDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const WAX_PRESETS = ['soy', 'olive', 'rapeseed', 'paraffin', 'coconut'] as const;
const WICK_PRESETS = ['cotton', 'wood'] as const;

export default function MaterialsDialog({ children, open: controlledOpen, onOpenChange }: MaterialsDialogProps) {
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { waxVariants, wickVariants, fragrance, color, saveVariants, saveSingleMaterial } = useMaterials();
  const { toast } = useToast();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isSaving, setIsSaving] = useState(false);

  const [waxList, setWaxList] = useState<MaterialVariant[]>([]);
  const [wickList, setWickList] = useState<MaterialVariant[]>([]);
  const [fragrancePrice, setFragrancePrice] = useState('0');
  const [fragranceUnit, setFragranceUnit] = useState<'ml' | 'l' | 'fl_oz'>('ml');
  const [colorPrice, setColorPrice] = useState('0');
  const [colorUnit, setColorUnit] = useState<'g' | 'oz'>('g');

  const [newWaxPreset, setNewWaxPreset] = useState<string>('soy');
  const [newWaxCustomName, setNewWaxCustomName] = useState('');
  const [newWaxPrice, setNewWaxPrice] = useState('0');
  const [newWaxUnit, setNewWaxUnit] = useState<'kg' | 'lb'>('kg');

  const [newWickPreset, setNewWickPreset] = useState<string>('cotton');
  const [newWickCustomName, setNewWickCustomName] = useState('');
  const [newWickPrice, setNewWickPrice] = useState('0');

  useEffect(() => {
    if (!open) return;
    setWaxList(waxVariants);
    setWickList(wickVariants);
    setFragrancePrice(String(fragrance?.price ?? 0));
    setFragranceUnit((fragrance?.unit as 'ml' | 'l' | 'fl_oz') ?? 'ml');
    setColorPrice(String(color?.price ?? 0));
    setColorUnit((color?.unit as 'g' | 'oz') ?? 'g');
    setNewWaxPreset('soy');
    setNewWaxCustomName('');
    setNewWaxPrice('0');
    setNewWaxUnit('kg');
    setNewWickPreset('cotton');
    setNewWickCustomName('');
    setNewWickPrice('0');
  }, [open, waxVariants, wickVariants, fragrance, color]);

  const waxPresetLabel = (preset: string) => t(`materials.wax_preset_${preset}`);
  const wickPresetLabel = (preset: string) => t(`materials.wick_preset_${preset}`);

  const handleAddWax = () => {
    const name = newWaxPreset === 'other' ? newWaxCustomName.trim() : waxPresetLabel(newWaxPreset);
    if (!name) return;
    setWaxList((prev) => [...prev, { id: '', name, unit: newWaxUnit, price: parseFloat(newWaxPrice) || 0 }]);
    setNewWaxCustomName('');
    setNewWaxPrice('0');
  };
  const handleAddWick = () => {
    const name = newWickPreset === 'other' ? newWickCustomName.trim() : wickPresetLabel(newWickPreset);
    if (!name) return;
    setWickList((prev) => [...prev, { id: '', name, unit: 'piece', price: parseFloat(newWickPrice) || 0 }]);
    setNewWickCustomName('');
    setNewWickPrice('0');
  };

  const updateWax = (index: number, patch: Partial<MaterialVariant>) => {
    setWaxList((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };
  const updateWick = (index: number, patch: Partial<MaterialVariant>) => {
    setWickList((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };
  const removeWax = (index: number) => setWaxList((prev) => prev.filter((_, i) => i !== index));
  const removeWick = (index: number) => setWickList((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        saveVariants('wax', waxList),
        saveVariants('wick', wickList),
        saveSingleMaterial('fragrance', fragranceUnit, parseFloat(fragrancePrice) || 0),
        saveSingleMaterial('color', colorUnit, parseFloat(colorPrice) || 0),
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
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            {t('materials.dialog_title')}
          </DialogTitle>
          <DialogDescription>{t('materials.dialog_description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          {/* CERA */}
          <div className="space-y-3">
            <Label className="text-base">{t('materials.wax_section_title')}</Label>
            {waxList.map((variant, index) => (
              <div key={variant.id || `new-wax-${index}`} className="flex gap-2 items-center">
                <Input
                  value={variant.name}
                  onChange={(e) => updateWax(index, { name: e.target.value })}
                  className="flex-1 min-w-0"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={variant.price}
                  onChange={(e) => updateWax(index, { price: parseFloat(e.target.value) || 0 })}
                  className="w-20 shrink-0"
                />
                <Select value={variant.unit} onValueChange={(v) => updateWax(index, { unit: v })}>
                  <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">{t('materials.unit_kg')}</SelectItem>
                    <SelectItem value="lb">{t('materials.unit_lb')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeWax(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={newWaxPreset} onValueChange={setNewWaxPreset}>
                <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WAX_PRESETS.map((p) => (
                    <SelectItem key={p} value={p}>{waxPresetLabel(p)}</SelectItem>
                  ))}
                  <SelectItem value="other">{t('materials.preset_other')}</SelectItem>
                </SelectContent>
              </Select>
              {newWaxPreset === 'other' && (
                <Input
                  placeholder={t('materials.variant_name_placeholder')}
                  value={newWaxCustomName}
                  onChange={(e) => setNewWaxCustomName(e.target.value)}
                  className="flex-1 min-w-[100px]"
                />
              )}
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newWaxPrice}
                onChange={(e) => setNewWaxPrice(e.target.value)}
                className="w-20 shrink-0"
              />
              <Select value={newWaxUnit} onValueChange={(v) => setNewWaxUnit(v as 'kg' | 'lb')}>
                <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">{t('materials.unit_kg')}</SelectItem>
                  <SelectItem value="lb">{t('materials.unit_lb')}</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="secondary" size="icon" className="shrink-0" onClick={handleAddWax}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* STOPPINO */}
          <div className="space-y-3">
            <Label className="text-base">{t('materials.wick_section_title')}</Label>
            {wickList.map((variant, index) => (
              <div key={variant.id || `new-wick-${index}`} className="flex gap-2 items-center">
                <Input
                  value={variant.name}
                  onChange={(e) => updateWick(index, { name: e.target.value })}
                  className="flex-1 min-w-0"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={variant.price}
                  onChange={(e) => updateWick(index, { price: parseFloat(e.target.value) || 0 })}
                  className="w-24 shrink-0"
                />
                <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeWick(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={newWickPreset} onValueChange={setNewWickPreset}>
                <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WICK_PRESETS.map((p) => (
                    <SelectItem key={p} value={p}>{wickPresetLabel(p)}</SelectItem>
                  ))}
                  <SelectItem value="other">{t('materials.preset_other')}</SelectItem>
                </SelectContent>
              </Select>
              {newWickPreset === 'other' && (
                <Input
                  placeholder={t('materials.variant_name_placeholder')}
                  value={newWickCustomName}
                  onChange={(e) => setNewWickCustomName(e.target.value)}
                  className="flex-1 min-w-[100px]"
                />
              )}
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newWickPrice}
                onChange={(e) => setNewWickPrice(e.target.value)}
                className="w-24 shrink-0"
              />
              <Button type="button" variant="secondary" size="icon" className="shrink-0" onClick={handleAddWick}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* FRAGRANZA */}
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

          {/* COLORE */}
          <div className="space-y-2">
            <Label htmlFor="color-price">{t('materials.color_label', { currency: currency.symbol })}</Label>
            <div className="flex gap-2">
              <Input
                id="color-price"
                type="number"
                step="0.01"
                min="0"
                value={colorPrice}
                onChange={(e) => setColorPrice(e.target.value)}
                className="flex-1 min-w-0"
              />
              <Select value={colorUnit} onValueChange={(v) => setColorUnit(v as 'g' | 'oz')}>
                <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">{t('materials.unit_g')}</SelectItem>
                  <SelectItem value="oz">{t('materials.unit_oz')}</SelectItem>
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
