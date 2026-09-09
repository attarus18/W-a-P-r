'use client';

import { useState } from 'react';
import RecipeCard from '@/components/recipes/recipe-card';
import { Button } from '@/components/ui/button';
import { BookMarked, Loader2, Printer } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { useRecipes } from '@/context/recipe-context';
import { useSubscription } from '@/context/subscription-context';
import { useToast } from '@/hooks/use-toast';
import { FREE_RECIPE_LIMIT, TRIAL_RECIPE_LIMIT, RECIPE_LIMITS, type PaidPlan } from '@/lib/constants';
import jsPDF from 'jspdf';
import { savePdf, getPdfLogoDataUrl } from '@/lib/pdf-utils';

export default function RecipesPage() {
  const { t } = useLanguage();
  const { recipes, isLoading } = useRecipes();
  const { hasActiveSubscription, subscription, isTrialing, isSubscriptionLoading } = useSubscription();
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);

  const getRecipeLimit = () => {
    if (isTrialing) return TRIAL_RECIPE_LIMIT;
    const plan = subscription?.subscriptionPlan as PaidPlan | undefined;
    if (plan && plan in RECIPE_LIMITS) return RECIPE_LIMITS[plan];
    return FREE_RECIPE_LIMIT;
  };
  const recipeLimit = getRecipeLimit();

  const handleGeneratePdf = async () => {
    if (recipes.length === 0) return;
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
        doc.text(t('recipes.title').toUpperCase(), titleX, y + 32, { charSpace: 1 });
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

      for (const recipe of recipes) {
        const hasNotes = Boolean(recipe.notes);
        const noteLines: string[] = hasNotes ? doc.splitTextToSize(recipe.notes!, pageWidth - margin * 2) : [];
        await ensureSpace(18 + 14 + rowHeight * 3 + (hasNotes ? noteLines.length * 12 + 6 : 0) + 18);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(textColor);
        doc.text(recipe.name, margin, y);
        y += 16;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(mutedColor);
        doc.text(
          `${t(`recipe_calculator.wax_${recipe.waxType}`)} · ${recipe.totalWeight} ${recipe.unit} · ${recipe.fragrancePct}% ${t('recipe_calculator.fragrance_label').toLowerCase()} · ${recipe.colorPct}% ${t('recipe_calculator.color_label').toLowerCase()}`,
          margin,
          y
        );
        y += 16;

        const details: [string, string][] = [
          [t('suggestion_card.wax'), `${recipe.waxAmount} ${recipe.unit}`],
          [t('recipe_calculator.fragrance_amount'), `${recipe.fragranceAmount} ${recipe.unit}`],
          [t('suggestion_card.color'), `${recipe.colorAmount} ${recipe.unit}`],
        ];
        doc.setFontSize(11);
        details.forEach(([label, value], rowIndex) => {
          if (rowIndex % 2 === 1) {
            doc.setFillColor(stripeColor);
            doc.rect(margin, y - rowHeight + 5, pageWidth - margin * 2, rowHeight, 'F');
          }
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(mutedColor);
          doc.text(`${label}:`, margin + 6, y);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(textColor);
          doc.text(value, pageWidth - margin - 6, y, { align: 'right' });
          y += rowHeight;
        });

        if (hasNotes) {
          y += 4;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(mutedColor);
          doc.text(noteLines, margin, y);
          y += noteLines.length * 12 + 2;
        }

        y += 10;
        doc.setDrawColor('#d1d5db');
        doc.line(margin, y - 5, pageWidth - margin, y - 5);
        y += 8;
      }

      await savePdf(doc, 'waxpro-ricette.pdf');
    } catch (error) {
      console.error('Error generating recipes PDF:', error);
      toast({
        variant: 'destructive',
        title: t('report.pdf_error_title'),
        description: t('report.pdf_error_description'),
      });
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading || isSubscriptionLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookMarked className="h-8 w-8 text-primary" />
            {t('recipes.title')}
          </h1>
          <p className="text-muted-foreground">{t('recipes.description')}</p>
          <p className="text-sm text-primary font-medium mt-1">
            {hasActiveSubscription
              ? t('recipes.recipe_count', { count: recipes.length, limit: recipeLimit })
              : t('recipes.recipe_count_free', { count: recipes.length, limit: FREE_RECIPE_LIMIT })}
          </p>
          {isTrialing && (
            <p className="text-xs text-muted-foreground mt-0.5">{t('recipes.trial_limit_note')}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {recipes.length > 0 && (
            <Button variant="outline" onClick={handleGeneratePdf} disabled={isPrinting}>
              {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              {t('recipes.print_button')}
            </Button>
          )}
          <Button asChild>
            <Link href="/recipe-calculator">
              <BookMarked className="mr-2 h-4 w-4" />
              {t('recipes.go_to_calculator_button')}
            </Link>
          </Button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-lg border-2 border-dashed border-border">
          <BookMarked className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t('recipes.empty_title')}</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{t('recipes.empty_description')}</p>
          <Button asChild>
            <Link href="/recipe-calculator">{t('recipes.go_to_calculator_button')}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
