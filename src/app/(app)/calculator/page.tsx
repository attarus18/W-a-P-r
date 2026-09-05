'use client';

import { useRef, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Share2, RotateCcw, Droplets, Palette, Truck, GlassWater, Flame, Combine, Printer, Loader2, Package, Tag, MoreHorizontal, Boxes } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useCurrency } from '@/context/currency-context';
import { useMaterials } from '@/context/materials-context';
import MaterialsDialog from '@/components/calculator/materials-dialog';
import { convertWeight, convertVolume, type WeightUnit, type VolumeUnit } from '@/lib/units';
import jsPDF from 'jspdf';
import { savePdf, getPdfLogoDataUrl } from '@/lib/pdf-utils';
import { format } from 'date-fns';
import { enUS, it, es, fr, de } from 'date-fns/locale';

const localeMap = { en: enUS, it, es, fr, de };

type FormValues = {
  nomeProdotto: string;
  ceraQty: number;
  ceraUnit: WeightUnit;
  stoppinoQty: number;
  contenitore: number;
  fragranzaQty: number;
  fragranzaUnit: VolumeUnit;
  colore: number;
  spedizione: number;
  packaging: number;
  etichette: number;
  altro: number;
};

export default function CalculatorPage() {
  const { register, handleSubmit, reset, getValues, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      nomeProdotto: '',
      ceraQty: 0,
      ceraUnit: 'g',
      stoppinoQty: 0,
      contenitore: 0,
      fragranzaQty: 0,
      fragranzaUnit: 'ml',
      colore: 0,
      spedizione: 0,
      packaging: 0,
      etichette: 0,
      altro: 0,
    }
  });
  const [totalCost, setTotalCost] = useState<number | null>(null);
  const [productName, setProductName] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { formatCurrency, currency } = useCurrency();
  const { materials } = useMaterials();
  const dateLocale = localeMap[language] || enUS;

  const [materialsDialogOpen, setMaterialsDialogOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const hasRemindedRef = useRef(false);

  const ceraUnit = watch('ceraUnit');
  const fragranzaUnit = watch('fragranzaUnit');

  const remindIfNotConfigured = (isConfigured: boolean) => {
    if (hasRemindedRef.current || isConfigured) return;
    hasRemindedRef.current = true;
    setReminderOpen(true);
  };

  const getWaxCost = (qty: number, unit: WeightUnit) => {
    if (!materials.wax) return 0;
    return convertWeight(Number(qty) || 0, unit, materials.wax.unit as WeightUnit) * materials.wax.price;
  };
  const getWickCost = (qty: number) => {
    if (!materials.wick) return 0;
    return (Number(qty) || 0) * materials.wick.price;
  };
  const getFragranceCost = (qty: number, unit: VolumeUnit) => {
    if (!materials.fragrance) return 0;
    return convertVolume(Number(qty) || 0, unit, materials.fragrance.unit as VolumeUnit) * materials.fragrance.price;
  };

  const onSubmit: SubmitHandler<FormValues> = data => {
    const { nomeProdotto, ceraQty, ceraUnit, stoppinoQty, fragranzaQty, fragranzaUnit, ...flatCostFields } = data;
    const flatCost = Object.values(flatCostFields).reduce((acc, value) => acc + (Number(value) || 0), 0);
    const cost = flatCost + getWaxCost(ceraQty, ceraUnit) + getWickCost(stoppinoQty) + getFragranceCost(fragranzaQty, fragranzaUnit);
    setTotalCost(cost);
    setProductName(nomeProdotto);
  };

  const handleReset = () => {
    reset();
    setTotalCost(null);
    setProductName('');
  };

  const handleShare = () => {
    if (totalCost !== null) {
      const shareText = productName
        ? `${productName} - ${t('calculator.share_text')}: ${formatCurrency(totalCost)}`
        : `${t('calculator.share_text')}: ${formatCurrency(totalCost)}`;
      navigator.clipboard.writeText(shareText);
      toast({
        title: t('calculator.toast_title'),
        description: t('calculator.toast_description'),
      });
    }
  };

  const handleGeneratePdf = async () => {
    if (totalCost === null) return;
    setIsPrinting(true);

    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
        const pageWidth = doc.internal.pageSize.width;
        const margin = 30;
        let y = margin;

        const primaryColor = '#f97316';
        const textColor = '#111827';
        const mutedColor = '#6b7280';

        // --- HEADER ---
        const logoDataUrl = await getPdfLogoDataUrl();
        if (logoDataUrl) {
            const logoSize = 32;
            doc.addImage(logoDataUrl, 'PNG', margin, y, logoSize, logoSize);
            y += logoSize + 8;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(primaryColor);
        doc.text('WAX PRO', pageWidth / 2, y, { align: 'center', charSpace: 2 });
        y += 15;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(mutedColor);
        doc.text(t('calculator.title').toUpperCase(), pageWidth / 2, y, { align: 'center', charSpace: 1 });
        y += 30;

        const formValues = getValues();

        // --- DATE & PRODUCT NAME ---
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mutedColor);
        doc.text(format(new Date(), 'PPP', { locale: dateLocale }), pageWidth - margin, y, { align: 'right' });

        if (formValues.nomeProdotto) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(textColor);
            doc.text(formValues.nomeProdotto, margin, y);
        }
        y += 20;

        // --- INPUT COSTS ---
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(mutedColor);
        doc.text(t('calculator.form_title').toUpperCase(), margin, y);
        y += 15;

        const costs = [
            { label: `${t('calculator.wax_cost_label', { currency: '' }).replace(' ()', '').trim()} (${formValues.ceraQty} ${t(`materials.unit_${formValues.ceraUnit}`)})`, value: getWaxCost(formValues.ceraQty, formValues.ceraUnit) },
            { label: `${t('calculator.wick_cost_label', { currency: '' }).replace(' ()', '').trim()} (${formValues.stoppinoQty})`, value: getWickCost(formValues.stoppinoQty) },
            { label: t('calculator.container_cost_label', { currency: '' }).replace(' ()', '').trim(), value: formValues.contenitore },
            { label: `${t('calculator.fragrance_cost_label', { currency: '' }).replace(' ()', '').trim()} (${formValues.fragranzaQty} ${t(`materials.unit_${formValues.fragranzaUnit}`)})`, value: getFragranceCost(formValues.fragranzaQty, formValues.fragranzaUnit) },
            { label: t('calculator.color_cost_label', { currency: '' }).replace(' ()', '').trim(), value: formValues.colore },
            { label: t('calculator.shipping_cost_label', { currency: '' }).replace(' ()', '').trim(), value: formValues.spedizione },
            { label: t('calculator.packaging_cost_label', { currency: '' }).replace(' ()', '').trim(), value: formValues.packaging },
            { label: t('calculator.labels_cost_label', { currency: '' }).replace(' ()', '').trim(), value: formValues.etichette },
            { label: t('calculator.other_cost_label', { currency: '' }).replace(' ()', '').trim(), value: formValues.altro },
        ];

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textColor);
        costs.forEach(cost => {
            doc.text(`${cost.label}:`, margin, y);
            doc.text(formatCurrency(cost.value), pageWidth - margin, y, { align: 'right' });
            y += 15;
        });
        
        y += 15;

        // --- TOTAL COST ---
        doc.setFillColor(primaryColor);
        doc.rect(margin, y, pageWidth - (margin * 2), 50, 'F');
        
        y += 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#FFFFFF');
        doc.text(t('calculator.result_title').toUpperCase(), margin + 15, y);
        
        y += 15;
        doc.setFontSize(22);
        doc.text(formatCurrency(totalCost), pageWidth - margin - 15, y, { align: 'right' });

        await savePdf(doc, 'waxpro-costo-produzione.pdf');
    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
            variant: "destructive",
            title: t('report.pdf_error_title'),
            description: t('report.pdf_error_description'),
        });
    } finally {
        setIsPrinting(false);
    }
  };

  const InputField = ({ id, label, icon: Icon, ...props }: { id: keyof FormValues, label: string, icon: React.ElementType, [key: string]: any }) => (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative flex items-center">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input id={id} type="number" step="0.01" className="pl-10" {...register(id)} {...props} />
        </div>
      </div>
  );

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('calculator.title')}</h1>
        <p className="text-muted-foreground">{t('calculator.description')}</p>
      </div>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>{t('calculator.form_title')}</CardTitle>
            <MaterialsDialog open={materialsDialogOpen} onOpenChange={setMaterialsDialogOpen}>
              <Button type="button" variant="outline" size="sm" className="shrink-0">
                <Boxes className="mr-2 h-4 w-4" />
                {t('materials.button_label')}
              </Button>
            </MaterialsDialog>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nomeProdotto">{t('calculator.product_name_label')}</Label>
              <Input id="nomeProdotto" type="text" {...register('nomeProdotto')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ceraQty">{t('calculator.wax_qty_label')}</Label>
              <div className="flex gap-2">
                <div className="relative flex items-center flex-1 min-w-0">
                  <Flame className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="ceraQty" type="number" step="0.01" className="pl-10" {...register('ceraQty')} onFocus={() => remindIfNotConfigured(!!materials.wax)} />
                </div>
                <Select value={ceraUnit} onValueChange={(v) => setValue('ceraUnit', v as WeightUnit)}>
                  <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">{t('materials.unit_g')}</SelectItem>
                    <SelectItem value="kg">{t('materials.unit_kg')}</SelectItem>
                    <SelectItem value="oz">{t('materials.unit_oz')}</SelectItem>
                    <SelectItem value="lb">{t('materials.unit_lb')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {materials.wax ? (
                <p className="text-xs text-muted-foreground">{formatCurrency(getWaxCost(watch('ceraQty'), ceraUnit))}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{t('materials.not_configured_hint')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stoppinoQty">{t('calculator.wick_qty_label')}</Label>
              <div className="relative flex items-center">
                <Combine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input id="stoppinoQty" type="number" step="1" className="pl-10" {...register('stoppinoQty')} onFocus={() => remindIfNotConfigured(!!materials.wick)} />
              </div>
              {materials.wick ? (
                <p className="text-xs text-muted-foreground">{formatCurrency(getWickCost(watch('stoppinoQty')))}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{t('materials.not_configured_hint')}</p>
              )}
            </div>

            <InputField id="contenitore" label={t('calculator.container_cost_label', { currency: currency.symbol })} icon={GlassWater} />

            <div className="space-y-2">
              <Label htmlFor="fragranzaQty">{t('calculator.fragrance_qty_label')}</Label>
              <div className="flex gap-2">
                <div className="relative flex items-center flex-1 min-w-0">
                  <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="fragranzaQty" type="number" step="0.01" className="pl-10" {...register('fragranzaQty')} onFocus={() => remindIfNotConfigured(!!materials.fragrance)} />
                </div>
                <Select value={fragranzaUnit} onValueChange={(v) => setValue('fragranzaUnit', v as VolumeUnit)}>
                  <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">{t('materials.unit_ml')}</SelectItem>
                    <SelectItem value="l">{t('materials.unit_l')}</SelectItem>
                    <SelectItem value="fl_oz">{t('materials.unit_fl_oz')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {materials.fragrance ? (
                <p className="text-xs text-muted-foreground">{formatCurrency(getFragranceCost(watch('fragranzaQty'), fragranzaUnit))}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{t('materials.not_configured_hint')}</p>
              )}
            </div>

            <InputField id="colore" label={t('calculator.color_cost_label', { currency: currency.symbol })} icon={Palette} />
            <InputField id="spedizione" label={t('calculator.shipping_cost_label', { currency: currency.symbol })} icon={Truck} />
            <InputField id="packaging" label={t('calculator.packaging_cost_label', { currency: currency.symbol })} icon={Package} />
            <InputField id="etichette" label={t('calculator.labels_cost_label', { currency: currency.symbol })} icon={Tag} />
            <InputField id="altro" label={t('calculator.other_cost_label', { currency: currency.symbol })} icon={MoreHorizontal} />
          </CardContent>
          <CardFooter className="flex justify-between items-center flex-wrap gap-4">
             <Button type="submit">{t('calculator.submit_button')}</Button>
             <Button type="button" variant="ghost" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" /> {t('calculator.reset_button')}
             </Button>
          </CardFooter>
        </form>
      </Card>
      
      {totalCost !== null && (
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle>{t('calculator.result_title')}</CardTitle>
            <CardDescription>
              {productName ? `${productName} — ${t('calculator.result_description')}` : t('calculator.result_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{formatCurrency(totalCost)}</p>
          </CardContent>
          <CardFooter className="flex-wrap justify-center gap-4">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              {t('calculator.share_button')}
            </Button>
            <Button variant="outline" onClick={handleGeneratePdf} disabled={isPrinting}>
              {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              {isPrinting ? t('report.generating_pdf') : t('calculator.pdf_button')}
            </Button>
          </CardFooter>
        </Card>
      )}

      <AlertDialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('materials.reminder_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('materials.reminder_description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('materials.reminder_dismiss')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => setMaterialsDialogOpen(true)}>
              {t('materials.reminder_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
