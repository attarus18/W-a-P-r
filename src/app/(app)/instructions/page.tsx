'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Calculator, Warehouse, PieChart, Wand2, Settings, NotebookPen } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

export default function InstructionsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          {t('instructions.title')}
        </h1>
        <p className="text-muted-foreground">{t('instructions.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('instructions.sections_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    {t('navbar.calculator')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>{t('instructions.calculator.p1')}</p>
                <ul>
                  <li><strong>{t('calculator.wax_cost_label', {currency: ''}).replace(' ()', '')}:</strong> {t('instructions.calculator.li1')}</li>
                  <li><strong>{t('calculator.wick_cost_label', {currency: ''}).replace(' ()', '')}:</strong> {t('instructions.calculator.li2')}</li>
                  <li><strong>{t('calculator.container_cost_label', {currency: ''}).replace(' ()', '')}:</strong> {t('instructions.calculator.li3')}</li>
                  <li><strong>{t('calculator.fragrance_cost_label', {currency: ''}).replace(' ()', '')}:</strong> {t('instructions.calculator.li4')}</li>
                  <li><strong>{t('calculator.color_cost_label', {currency: ''}).replace(' ()', '')}:</strong> {t('instructions.calculator.li5')}</li>
                  <li><strong>{t('calculator.shipping_cost_label', {currency: ''}).replace(' ()', '')}:</strong> {t('instructions.calculator.li6')}</li>
                </ul>
                <p>{t('instructions.calculator.p2')}</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger>
                 <div className="flex items-center gap-2">
                    <NotebookPen className="h-5 w-5 text-primary" />
                    {t('navbar.recipe_calculator')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>{t('instructions.recipe_calculator.p1')}</p>
                 <ul>
                  <li><strong>{t('recipe_calculator.unit_label')}:</strong> {t('instructions.recipe_calculator.li1')}</li>
                  <li><strong>{t('recipe_calculator.total_weight_label', {unit: ''}).replace(' ()', '')}:</strong> {t('instructions.recipe_calculator.li2')}</li>
                  <li><strong>{t('recipe_calculator.fragrance_label')}:</strong> {t('instructions.recipe_calculator.li3')}</li>
                  <li><strong>{t('recipe_calculator.color_label')}:</strong> {t('instructions.recipe_calculator.li4')}</li>
                </ul>
                <p>{t('instructions.recipe_calculator.p2')}</p>
                <p>{t('instructions.recipe_calculator.p3')}</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-primary" />
                    {t('navbar.inventory')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>{t('instructions.inventory.p1')}</p>
                <p>{t('instructions.inventory.p2')}</p>
                <p>{t('instructions.inventory.p3')}</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    {t('navbar.report')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>{t('instructions.report.p1')}</p>
                 <ul>
                  <li><strong>{t('report.total_profit')}:</strong> {t('instructions.report.li1')}</li>
                  <li><strong>{t('report.total_sold')}:</strong> {t('instructions.report.li2')}</li>
                  <li><strong>{t('report.total_stock')}:</strong> {t('instructions.report.li3')}</li>
                </ul>
                <p>{t('instructions.report.p2')}</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    {t('navbar.ai_suggester')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>{t('instructions.ai_suggester.p1')}</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-6">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    {t('navbar.settings')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>{t('instructions.settings.p1')}</p>
                 <ul>
                  <li><strong>{t('settings.profile_title')}:</strong> {t('instructions.settings.li1')}</li>
                  <li><strong>{t('settings.subscription_card_title')}:</strong> {t('instructions.settings.li2')}</li>
                  <li><strong>{t('settings.theme_title')}:</strong> {t('instructions.settings.li3')}</li>
                   <li><strong>{t('settings.preferences_title')}:</strong> {t('instructions.settings.li4')}</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
