'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Loader2, TriangleAlert, FileSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useMaterials } from '@/context/materials-context';
import { GhsPictogram, getGhsPictogramDataUrl, GHS_PICTOGRAM_TYPES, type GhsPictogramType } from '@/lib/ghs-pictograms';
import jsPDF from 'jspdf';
import { savePdf } from '@/lib/pdf-utils';

type FormValues = {
  productName: string;
  netWeight: number;
  waxTypeName: string;
  fragrancePercent: number;
  hPhrases: string;
  pPhrases: string;
  allergens: string;
  ufiCode: string;
  companyName: string;
  companyAddress: string;
  companyEmail: string;
};

export default function LabelClpPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { waxVariants } = useMaterials();
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedPictograms, setSelectedPictograms] = useState<GhsPictogramType[]>([]);
  const [waxSelectMode, setWaxSelectMode] = useState('other');

  const { register, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      productName: '',
      netWeight: 0,
      waxTypeName: '',
      fragrancePercent: 0,
      hPhrases: '',
      pPhrases: '',
      allergens: '',
      ufiCode: '',
      companyName: '',
      companyAddress: '',
      companyEmail: '',
    },
  });

  const values = watch();

  const togglePictogram = (type: GhsPictogramType) => {
    setSelectedPictograms((prev) => (prev.includes(type) ? prev.filter((p) => p !== type) : [...prev, type]));
  };

  const handleGeneratePdf = async () => {
    setIsPrinting(true);
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;
      const margin = 30;
      let y = margin;

      const textColor = '#111827';
      const mutedColor = '#6b7280';
      const lineColor = '#e5e7eb';

      // --- PRODUCT NAME & SUBTITLE ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(textColor);
      doc.text(values.productName || '-', margin, y);
      y += 16;

      const subtitleParts = [
        values.waxTypeName ? t('label_clp.subtitle_wax', { wax: values.waxTypeName }) : '',
        t('label_clp.subtitle_fragrance', { percent: values.fragrancePercent || 0 }),
      ].filter(Boolean);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(mutedColor);
      doc.text(subtitleParts.join(' · '), margin, y);
      y += 22;

      // --- NET WEIGHT ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(mutedColor);
      doc.text(t('label_clp.net_weight_label').toUpperCase(), margin, y);
      doc.setFontSize(13);
      doc.setTextColor(textColor);
      doc.text(`${values.netWeight || 0} g`, pageWidth - margin, y, { align: 'right' });
      y += 20;

      // --- PICTOGRAMS ---
      if (selectedPictograms.length > 0) {
        doc.setDrawColor(lineColor);
        doc.line(margin, y, pageWidth - margin, y);
        y += 20;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(textColor);
        doc.text(t('label_clp.warning_label').toUpperCase(), margin, y - 8);

        let px = margin;
        for (const type of selectedPictograms) {
          const dataUrl = await getGhsPictogramDataUrl(type);
          doc.addImage(dataUrl, 'PNG', px, y, 36, 36);
          px += 42;
        }
        y += 48;
      }

      // --- H PHRASES ---
      if (values.hPhrases) {
        doc.setDrawColor(lineColor);
        doc.line(margin, y, pageWidth - margin, y);
        y += 16;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(mutedColor);
        doc.text(t('label_clp.h_phrases_label').toUpperCase(), margin, y);
        y += 12;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(textColor);
        const lines = doc.splitTextToSize(values.hPhrases, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 11 + 10;
      }

      // --- P PHRASES ---
      if (values.pPhrases) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(mutedColor);
        doc.text(t('label_clp.p_phrases_label').toUpperCase(), margin, y);
        y += 12;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(textColor);
        const lines = doc.splitTextToSize(values.pPhrases, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 11 + 10;
      }

      // --- ALLERGENS ---
      if (values.allergens) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(textColor);
        const allergenLines = doc.splitTextToSize(`${t('label_clp.allergens_label')}: ${values.allergens}`, pageWidth - margin * 2);
        doc.text(allergenLines, margin, y);
        y += allergenLines.length * 11 + 8;
      }

      // --- UFI ---
      if (values.ufiCode) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(textColor);
        doc.text(`UFI: ${values.ufiCode}`, margin, y);
        y += 18;
      }

      // --- COMPANY ---
      if (values.companyName || values.companyAddress || values.companyEmail) {
        doc.setDrawColor(lineColor);
        doc.line(margin, y, pageWidth - margin, y);
        y += 16;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(textColor);
        if (values.companyName) {
          doc.text(values.companyName, margin, y);
          y += 12;
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mutedColor);
        if (values.companyAddress) {
          doc.text(values.companyAddress, margin, y);
          y += 12;
        }
        if (values.companyEmail) {
          doc.text(values.companyEmail, margin, y);
          y += 12;
        }
      }

      await savePdf(doc, 'waxpro-etichetta-clp.pdf');
    } catch (error) {
      console.error('Error generating CLP label PDF:', error);
      toast({
        variant: 'destructive',
        title: t('report.pdf_error_title'),
        description: t('report.pdf_error_description'),
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('label_clp.title')}</h1>
        <p className="text-muted-foreground">{t('label_clp.description')}</p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 items-start">
        <TriangleAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">{t('label_clp.disclaimer')}</p>
      </div>

      <div className="rounded-lg border border-input bg-card p-4 flex gap-3 items-start">
        <FileSearch className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">{t('label_clp.sds_guide_title')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('label_clp.sds_guide_pictograms')}</li>
            <li>{t('label_clp.sds_guide_h_phrases')}</li>
            <li>{t('label_clp.sds_guide_p_phrases')}</li>
            <li>{t('label_clp.sds_guide_allergens')}</li>
            <li>{t('label_clp.sds_guide_ufi')}</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle>{t('label_clp.form_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="productName">{t('label_clp.product_name_label')}</Label>
                <Input id="productName" type="text" {...register('productName')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="netWeight">{t('label_clp.net_weight_label')}</Label>
                <Input id="netWeight" type="number" step="1" min="0" {...register('netWeight')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fragrancePercent">{t('label_clp.fragrance_percent_label')}</Label>
                <Input id="fragrancePercent" type="number" step="0.1" min="0" {...register('fragrancePercent')} />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>{t('label_clp.wax_type_label')}</Label>
                <Select
                  value={waxSelectMode}
                  onValueChange={(v) => {
                    setWaxSelectMode(v);
                    if (v !== 'other') setValue('waxTypeName', v);
                    else setValue('waxTypeName', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('label_clp.wax_select_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {waxVariants.map((v) => (
                      <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                    ))}
                    <SelectItem value="other">{t('materials.preset_other')}</SelectItem>
                  </SelectContent>
                </Select>
                {waxSelectMode === 'other' && (
                  <Input
                    placeholder={t('label_clp.wax_custom_placeholder')}
                    {...register('waxTypeName')}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('label_clp.pictograms_label')}</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {GHS_PICTOGRAM_TYPES.map((type) => {
                  const isSelected = selectedPictograms.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => togglePictogram(type)}
                      className={`flex flex-col items-center gap-1 rounded-md border p-2 transition-colors ${isSelected ? 'border-primary bg-primary/10' : 'border-input hover:bg-accent'}`}
                    >
                      <GhsPictogram type={type} size={40} />
                      <span className="text-[10px] text-muted-foreground">{t(`label_clp.pictogram_${type.toLowerCase()}`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hPhrases">{t('label_clp.h_phrases_label')}</Label>
              <Textarea id="hPhrases" rows={3} placeholder={t('label_clp.h_phrases_placeholder')} {...register('hPhrases')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pPhrases">{t('label_clp.p_phrases_label')}</Label>
              <Textarea id="pPhrases" rows={3} placeholder={t('label_clp.p_phrases_placeholder')} {...register('pPhrases')} />
            </div>

            <p className="text-xs text-muted-foreground">{t('label_clp.sds_hint')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="allergens">{t('label_clp.allergens_label')}</Label>
                <Input id="allergens" type="text" placeholder={t('label_clp.allergens_placeholder')} {...register('allergens')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ufiCode">{t('label_clp.ufi_label')}</Label>
                <Input id="ufiCode" type="text" placeholder="U2P0-W0FY-100R-XKB9" {...register('ufiCode')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="companyName">{t('label_clp.company_name_label')}</Label>
                <Input id="companyName" type="text" {...register('companyName')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="companyAddress">{t('label_clp.company_address_label')}</Label>
                <Input id="companyAddress" type="text" {...register('companyAddress')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="companyEmail">{t('label_clp.company_email_label')}</Label>
                <Input id="companyEmail" type="email" {...register('companyEmail')} />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="button" onClick={handleGeneratePdf} disabled={isPrinting}>
              {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              {isPrinting ? t('report.generating_pdf') : t('label_clp.pdf_button')}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>{t('label_clp.preview_title')}</CardTitle>
            <CardDescription>{t('label_clp.preview_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
              <div>
                <p className="font-bold text-base">{values.productName || t('label_clp.preview_placeholder_name')}</p>
                <p className="text-muted-foreground text-xs">
                  {[
                    values.waxTypeName ? t('label_clp.subtitle_wax', { wax: values.waxTypeName }) : '',
                    t('label_clp.subtitle_fragrance', { percent: values.fragrancePercent || 0 }),
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">{t('label_clp.net_weight_label')}</span>
                <span className="font-semibold">{values.netWeight || 0} g</span>
              </div>

              {selectedPictograms.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <span className="font-bold text-xs">{t('label_clp.warning_label')}</span>
                  <div className="flex gap-2 flex-wrap">
                    {selectedPictograms.map((p) => <GhsPictogram key={p} type={p} size={36} />)}
                  </div>
                </div>
              )}

              {values.hPhrases && (
                <div className="border-t pt-3">
                  <p className="font-bold text-xs mb-1">{t('label_clp.h_phrases_label')}</p>
                  <p className="text-xs whitespace-pre-line">{values.hPhrases}</p>
                </div>
              )}

              {values.pPhrases && (
                <div>
                  <p className="font-bold text-xs mb-1">{t('label_clp.p_phrases_label')}</p>
                  <p className="text-xs whitespace-pre-line">{values.pPhrases}</p>
                </div>
              )}

              {values.allergens && (
                <p className="text-xs"><span className="font-semibold">{t('label_clp.allergens_label')}:</span> {values.allergens}</p>
              )}

              {values.ufiCode && (
                <p className="text-xs font-mono">UFI: {values.ufiCode}</p>
              )}

              {(values.companyName || values.companyAddress || values.companyEmail) && (
                <div className="border-t pt-3 text-xs text-muted-foreground">
                  {values.companyName && <p className="font-semibold text-foreground">{values.companyName}</p>}
                  {values.companyAddress && <p>{values.companyAddress}</p>}
                  {values.companyEmail && <p>{values.companyEmail}</p>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
