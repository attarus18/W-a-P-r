'use client';

import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { savePdf } from '@/lib/pdf-utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sparkles, Loader2, TriangleAlert, Wand2, Printer } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/auth-context';
import { useSubscription } from '@/context/subscription-context';
import { createClient } from '@/lib/supabase/client';
import AccessDenied from '@/components/auth/access-denied';
import ProFeatureDialog from '@/components/auth/pro-feature-dialog';

interface FragranceComponent {
  name: string;
  percentage: number;
}

interface FragranceOption {
  title: string;
  description: string;
  topNote: string;
  heartNote: string;
  baseNote: string;
  fragrances: FragranceComponent[];
}

export default function AiSuggesterPage() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { user } = useUser();
  const { hasActiveSubscription, isSubscriptionLoading } = useSubscription();
  const [supabase] = useState(() => createClient());

  const [concept, setConcept] = useState('');
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [conceptOptions, setConceptOptions] = useState<FragranceOption[] | null>(null);
  const [isBlockedDialogOpen, setIsBlockedDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Appena arrivano le 3 proposte, portiamo la pagina fin li': su schermi
  // piccoli l'utente altrimenti dovrebbe scorrere manualmente oltre il form
  // per accorgersi che il risultato e' gia' pronto.
  useEffect(() => {
    if (conceptOptions) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [conceptOptions]);

  const handleGenerateConcept = async () => {
    if (!concept.trim()) return;
    setIsGeneratingConcept(true);
    setConceptOptions(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/suggest-fragrance-concept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ concept, language }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(t('ai_suggester.rate_limit_error'));
        }
        throw new Error(body.error || t('ai_suggester.error_desc'));
      }
      if (body.blocked) {
        setBlockReason(body.blockReason || t('ai_suggester.concept_blocked_default_reason'));
        setIsBlockedDialogOpen(true);
      } else {
        setConceptOptions(body.options);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('ai_suggester.error_title'),
        description: error.message || t('ai_suggester.error_desc'),
      });
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  const handleCloseBlockedDialog = () => {
    setIsBlockedDialogOpen(false);
    setConcept('');
  };

  // window.print() non ha effetto dentro la WebView Android dell'app (non e'
  // un vero browser: non c'e' un motore di stampa di sistema agganciato).
  // Generiamo quindi un PDF vero con jsPDF e lo passiamo a savePdf(), lo
  // stesso helper gia' usato dal Calcolatore e dal Report: su nativo apre il
  // foglio di condivisione Android (da cui si puo' salvare, stampare o
  // inviare), sul web usa la Web Share API se disponibile o il download.
  const handlePrint = async () => {
    if (!conceptOptions || conceptOptions.length === 0) return;

    setIsPreparingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 15;
      const maxY = doc.internal.pageSize.getHeight() - 20;
      const textWidth = pageWidth - marginX * 2;
      let y = 20;

      const ensureSpace = (needed: number) => {
        if (y + needed > maxY) {
          doc.addPage();
          y = 20;
        }
      };

      doc.setFontSize(16);
      doc.text(t('ai_suggester.concept_result_title'), marginX, y);
      y += 10;

      conceptOptions.forEach((option) => {
        ensureSpace(20);
        doc.setFontSize(13);
        doc.text(option.title, marginX, y);
        y += 7;

        doc.setFontSize(10);
        const descLines: string[] = doc.splitTextToSize(option.description, textWidth);
        ensureSpace(descLines.length * 5);
        doc.text(descLines, marginX, y);
        y += descLines.length * 5 + 3;

        ensureSpace(15);
        doc.text(`${t('ai_suggester.top_note_label')}: ${option.topNote}`, marginX, y);
        y += 5;
        doc.text(`${t('ai_suggester.heart_note_label')}: ${option.heartNote}`, marginX, y);
        y += 5;
        doc.text(`${t('ai_suggester.base_note_label')}: ${option.baseNote}`, marginX, y);
        y += 7;

        option.fragrances.forEach((f) => {
          ensureSpace(5);
          doc.text(`${f.name} — ${f.percentage}%`, marginX + 4, y);
          y += 5;
        });
        y += 8;
      });

      await savePdf(doc, 'waxpro-proposte-fragranza.pdf');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('ai_suggester.error_title'),
        description: error.message || t('ai_suggester.error_desc'),
      });
    } finally {
      setIsPreparingPdf(false);
    }
  };

  if (isSubscriptionLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AccessDenied featureName={t('navbar.ai_suggester')} />;
  }

  if (!hasActiveSubscription) {
    return <ProFeatureDialog />;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          {t('ai_suggester.title')}
        </h1>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 items-start print:hidden">
        <TriangleAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">{t('ai_suggester.disclaimer')}</p>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>{t('ai_suggester.concept_form_title')}</CardTitle>
          <CardDescription>{t('ai_suggester.concept_form_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="concept">{t('ai_suggester.concept_label')}</Label>
          <Textarea
            id="concept"
            rows={3}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder={t('ai_suggester.concept_placeholder')}
            maxLength={300}
          />
        </CardContent>
        <CardFooter>
          <Button type="button" onClick={handleGenerateConcept} disabled={isGeneratingConcept || !concept.trim()}>
            {isGeneratingConcept ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {isGeneratingConcept ? t('ai_suggester.generating') : t('ai_suggester.concept_submit_button')}
          </Button>
        </CardFooter>
      </Card>

      {conceptOptions && (
        <div ref={resultsRef} className="space-y-6 scroll-mt-4">
          <div className="flex items-center justify-between print:hidden">
            <h2 className="text-xl font-semibold">{t('ai_suggester.concept_result_title')}</h2>
            <Button variant="outline" onClick={handlePrint} disabled={isPreparingPdf}>
              {isPreparingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              {t('ai_suggester.print_button')}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {conceptOptions.map((option, index) => (
              <Card key={index} className="bg-primary/10 border-primary/20 break-inside-avoid">
                <CardHeader>
                  <CardTitle>{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t('ai_suggester.top_note_label')}</p>
                      <p className="font-medium">{option.topNote}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t('ai_suggester.heart_note_label')}</p>
                      <p className="font-medium">{option.heartNote}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t('ai_suggester.base_note_label')}</p>
                      <p className="font-medium">{option.baseNote}</p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    {option.fragrances.map((f, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-muted-foreground">{f.name}</span>
                        <span className="font-bold text-primary">{f.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={isBlockedDialogOpen} onOpenChange={setIsBlockedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('ai_suggester.concept_blocked_title')}</AlertDialogTitle>
            <AlertDialogDescription>{blockReason}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseBlockedDialog}>
              {t('ai_suggester.concept_blocked_close')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
