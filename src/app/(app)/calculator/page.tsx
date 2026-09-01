'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Share2, RotateCcw, Droplets, Palette, Truck, GlassWater, Flame, Combine, Printer, Loader2, Package, Tag, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useCurrency } from '@/context/currency-context';
import jsPDF from 'jspdf';
import { savePdf, getPdfLogoDataUrl } from '@/lib/pdf-utils';
import { format } from 'date-fns';
import { enUS, it, es, fr, de } from 'date-fns/locale';

const localeMap = { en: enUS, it, es, fr, de };

type FormValues = {
  nomeProdotto: string;
  cera: number;
  stoppino: number;
  contenitore: number;
  fragranza: number;
  colore: number;
  spedizione: number;
  packaging: number;
  etichette: number;
  altro: number;
};

export default function CalculatorPage() {
  const { register, handleSubmit, reset, getValues, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      nomeProdotto: '',
      cera: 0,
      stoppino: 0,
      contenitore: 0,
      fragranza: 0,
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
  const dateLocale = localeMap[language] || enUS;

  const onSubmit: SubmitHandler<FormValues> = data => {
    const { nomeProdotto, ...costFields } = data;
    const cost = Object.values(costFields).reduce((acc, value) => acc + (Number(value) || 0), 0);
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
            { label: t('calculator.wax_cost_label', { currency: '' }).replace(' ()', '').trim(), value: formValues.cera },
            { label: t('calculator.wick_cost_label', { currency: '' }).replace(' ()', '').trim(), value: formValues.stoppino },
            { label: t('calculator.container_cost_label', { currency: '' }).replace(' ()', '').trim(), value: formValues.contenitore },
            { label: t('calculator.fragrance_cost_label', { currency: '' }).replace(' ()', '').trim(), value: formValues.fragranza },
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
          <CardHeader>
            <CardTitle>{t('calculator.form_title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nomeProdotto">{t('calculator.product_name_label')}</Label>
              <Input id="nomeProdotto" type="text" {...register('nomeProdotto')} />
            </div>
            <InputField id="cera" label={t('calculator.wax_cost_label', { currency: currency.symbol })} icon={Flame} />
            <InputField id="stoppino" label={t('calculator.wick_cost_label', { currency: currency.symbol })} icon={Combine} />
            <InputField id="contenitore" label={t('calculator.container_cost_label', { currency: currency.symbol })} icon={GlassWater} />
            <InputField id="fragranza" label={t('calculator.fragrance_cost_label', { currency: currency.symbol })} icon={Droplets} />
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
          <CardFooter className="justify-center gap-4">
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
    </div>
  );
}
