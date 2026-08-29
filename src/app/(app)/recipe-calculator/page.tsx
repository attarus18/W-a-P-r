'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Scale, Droplets, Palette, NotebookPen, Flame, Weight, Share2, Printer, BookMarked } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { savePdf, getPdfLogoDataUrl } from '@/lib/pdf-utils';
import { useRecipes } from '@/context/recipe-context';
import { useSubscription } from '@/context/subscription-context';
import SaveRecipeDialog from '@/components/recipes/save-recipe-dialog';
import { FREE_RECIPE_LIMIT } from '@/lib/constants';

type FormValues = {
  totalWeight: number;
  unit: 'g' | 'oz' | 'kg' | 'lb';
};

type RecipeResult = {
    wax: number;
    fragrance: number;
    color: number;
}

export default function RecipeCalculatorPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [fragrance, setFragrance] = useState(5);
  const [color, setColor] = useState(1);
  const [result, setResult] = useState<RecipeResult | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const { recipes, addRecipe } = useRecipes();
  const { hasActiveSubscription } = useSubscription();

  const form = useForm<FormValues>({
    defaultValues: {
      totalWeight: 100,
      unit: 'g',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    const totalWeight = data.totalWeight;
    const fragranceAmount = totalWeight * (fragrance / 100);
    const colorAmount = totalWeight * (color / 100);
    const waxAmount = totalWeight - fragranceAmount - colorAmount;
    
    setResult({
        wax: parseFloat(waxAmount.toFixed(2)),
        fragrance: parseFloat(fragranceAmount.toFixed(2)),
        color: parseFloat(colorAmount.toFixed(2)),
    });
  };

  const handleReset = () => {
    form.reset();
    setFragrance(5);
    setColor(1);
    setResult(null);
  };
  
  const unit = form.watch('unit');
  const totalWeight = form.watch('totalWeight');

  const atRecipeLimit = !hasActiveSubscription && recipes.length >= FREE_RECIPE_LIMIT;

  const handleSaveClick = () => {
    if (atRecipeLimit) {
      toast({
        variant: 'destructive',
        title: t('recipes.limit_reached_title'),
        description: t('recipes.limit_reached_desc', { limit: FREE_RECIPE_LIMIT }),
      });
    } else {
      setIsSaveDialogOpen(true);
    }
  };

  const handleSaveRecipe = ({ name, notes }: { name: string; notes: string }) => {
    if (!result) return;
    addRecipe({
      name,
      notes: notes || undefined,
      totalWeight,
      unit,
      fragrancePct: fragrance,
      colorPct: color,
      waxAmount: result.wax,
      fragranceAmount: result.fragrance,
      colorAmount: result.color,
    });
    setIsSaveDialogOpen(false);
    toast({
      title: t('recipes.toast_saved_title'),
      description: t('recipes.toast_saved_description'),
    });
  };

  const handleShare = () => {
    if (result) {
      const shareText = `
${t('recipe_calculator.result_title')}:
- ${t('suggestion_card.wax')}: ${result.wax} ${unit}
- ${t('recipe_calculator.fragrance_amount')}: ${result.fragrance} ${unit}
- ${t('suggestion_card.color')}: ${result.color} ${unit}
      `.trim();
      navigator.clipboard.writeText(shareText);
      toast({
        title: t('calculator.toast_title'),
        description: t('recipe_calculator.toast_description'),
      });
    }
  };

  const handleGeneratePdf = async () => {
    if (result) {
      try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const margin = 30;
        let y = margin;
  
        // Colors
        const primaryColor = '#f97316';
        const textColor = '#111827';
        const mutedColor = '#6b7280';
        const lightBgColor = '#f9fafb';
  
        // --- HEADER ---
        const logoDataUrl = await getPdfLogoDataUrl();
        if (logoDataUrl) {
            const logoSize = 10; // doc in unit 'mm' (default jsPDF), a differenza delle altre pagine in 'px'
            doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - logoSize / 2, y, logoSize, logoSize);
            y += logoSize + 4;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(primaryColor);
        doc.text('WAX PRO', pageWidth / 2, y, { align: 'center', charSpace: 2 });
        y += 15;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(mutedColor);
        doc.text(t('recipe_calculator.title').toUpperCase(), pageWidth / 2, y, { align: 'center', charSpace: 1 });
        y += 30;
  
        // --- RECIPE DETAILS ---
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(mutedColor);
        doc.text(t('recipe_calculator.form_title').toUpperCase(), margin, y);
        y += 15;
  
        const details = [
          `${t('recipe_calculator.total_weight_label', { unit })}: ${totalWeight} ${unit}`,
          `${t('recipe_calculator.fragrance_label')}: ${fragrance}%`,
          `${t('recipe_calculator.color_label')}: ${color}%`,
        ];
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textColor);
        details.forEach(detail => {
          doc.text(detail, margin, y);
          y += 15;
        });
  
        y += 15;
  
        // --- RESULTS ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColor);
        doc.text(t('recipe_calculator.result_title').toUpperCase(), margin, y);
        y += 20;
  
        const resultsData = [
            { label: t('suggestion_card.wax'), value: `${result.wax} ${unit}` },
            { label: t('recipe_calculator.fragrance_amount'), value: `${result.fragrance} ${unit}` },
            { label: t('suggestion_card.color'), value: `${result.color} ${unit}` },
        ];
  
        doc.setFillColor(lightBgColor);
        doc.rect(margin, y - 10, pageWidth - (margin * 2), resultsData.length * 25 + 5, 'F');
        
        resultsData.forEach(({label, value}) => {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(mutedColor);
            doc.text(label, margin + 10, y + 5);
  
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryColor);
            doc.text(value, pageWidth - margin - 10, y + 5, { align: 'right' });
            y += 25;
        });
  
        await savePdf(doc, 'waxpro-recipe.pdf');
      } catch (error) {
          console.error("Error generating PDF:", error);
          toast({
              variant: "destructive",
              title: t('report.pdf_error_title'),
              description: t('report.pdf_error_description'),
          });
      }
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <NotebookPen className="h-8 w-8 text-primary" />
            {t('recipe_calculator.title')}
        </h1>
        <p className="text-muted-foreground">{t('recipe_calculator.description')}</p>
      </div>
      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>{t('recipe_calculator.form_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="unit" className="flex items-center gap-2"><Scale className="h-4 w-4" />{t('recipe_calculator.unit_label')}</Label>
                    <Select value={form.watch('unit')} onValueChange={(value) => form.setValue('unit', value as 'g' | 'oz' | 'kg' | 'lb')}>
                        <SelectTrigger id="unit">
                            <SelectValue placeholder={t('recipe_calculator.unit_placeholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="g">{t('recipe_calculator.unit_g')}</SelectItem>
                            <SelectItem value="oz">{t('recipe_calculator.unit_oz')}</SelectItem>
                            <SelectItem value="kg">{t('recipe_calculator.unit_kg')}</SelectItem>
                            <SelectItem value="lb">{t('recipe_calculator.unit_lb')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="totalWeight" className="flex items-center gap-2"><Weight className="h-4 w-4" />{t('recipe_calculator.total_weight_label', { unit })}</Label>
                    <Input id="totalWeight" type="number" {...form.register('totalWeight', { valueAsNumber: true })} />
                </div>
            </div>
            
            <div className="space-y-4">
              <Label htmlFor="fragrancePercentage" className="flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                {t('recipe_calculator.fragrance_label')} ({fragrance}%)
              </Label>
              <Slider
                id="fragrancePercentage"
                min={0}
                max={20}
                step={0.5}
                value={[fragrance]}
                onValueChange={(value) => setFragrance(value[0])}
              />
            </div>
            
            <div className="space-y-4">
              <Label htmlFor="colorPercentage" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                {t('recipe_calculator.color_label')} ({color}%)
              </Label>
              <Slider
                id="colorPercentage"
                min={0}
                max={10}
                step={0.1}
                value={[color]}
                onValueChange={(value) => setColor(value[0])}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center flex-wrap gap-4">
             <Button type="submit">{t('recipe_calculator.submit_button')}</Button>
             <Button type="button" variant="ghost" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" /> {t('calculator.reset_button')}
             </Button>
          </CardFooter>
        </form>
      </Card>
      
      {result && (
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle>{t('recipe_calculator.result_title')}</CardTitle>
            <CardDescription>{t('recipe_calculator.result_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex justify-between items-center text-lg">
                <span className="flex items-center gap-2 text-muted-foreground"><Flame className="h-5 w-5" /> {t('suggestion_card.wax')}:</span>
                <span className="font-bold text-primary">{result.wax} {unit}</span>
            </div>
             <div className="flex justify-between items-center text-lg">
                <span className="flex items-center gap-2 text-muted-foreground"><Droplets className="h-5 w-5" /> {t('recipe_calculator.fragrance_amount')}:</span>
                <span className="font-bold text-primary">{result.fragrance} {unit}</span>
            </div>
            <div className="flex justify-between items-center text-lg">
                <span className="flex items-center gap-2 text-muted-foreground"><Palette className="h-5 w-5" /> {t('suggestion_card.color')}:</span>
                <span className="font-bold text-primary">{result.color} {unit}</span>
            </div>
          </CardContent>
           <CardFooter className="justify-center gap-4 flex-wrap">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              {t('calculator.share_button')}
            </Button>
            <Button variant="outline" onClick={handleGeneratePdf}>
              <Printer className="mr-2 h-4 w-4" />
              {t('recipe_calculator.pdf_button')}
            </Button>
            <SaveRecipeDialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen} onSave={handleSaveRecipe}>
              <Button onClick={handleSaveClick} disabled={atRecipeLimit}>
                <BookMarked className="mr-2 h-4 w-4" />
                {t('recipes.save_button')}
              </Button>
            </SaveRecipeDialog>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
