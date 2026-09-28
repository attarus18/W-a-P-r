'use client';

import { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import { savePdf, getPdfLogoDataUrl } from '@/lib/pdf-utils';
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
import { Sparkles, Loader2, TriangleAlert, Wand2, Printer, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { showRewardedAd } from '@/lib/rewarded-ad';
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

  // Chi non e' abbonato guarda un video con ricompensa prima di ogni richiesta
  // (solo nell'app Android). isNative si legge in un effect, non durante il
  // render, per non creare differenze tra HTML del server e del client.
  const [isNative, setIsNative] = useState(false);
  const [nativeChecked, setNativeChecked] = useState(false);
  const [rewardStatus, setRewardStatus] = useState<{ available: number; usedToday: number; dailyLimit: number } | null>(null);
  const [rewardPhase, setRewardPhase] = useState<'idle' | 'watching' | 'confirming'>('idle');

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    setNativeChecked(true);
  }, []);

  const fetchRewardStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/rewards/status', {
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    if (!res.ok) throw new Error(t('ai_suggester.error_desc'));
    const status = await res.json();
    setRewardStatus(status);
    return status as { available: number; usedToday: number; dailyLimit: number };
  };

  useEffect(() => {
    if (!user || isSubscriptionLoading || hasActiveSubscription || !isNative) return;
    fetchRewardStatus().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSubscriptionLoading, hasActiveSubscription, isNative]);

  // Garantisce che l'utente non abbonato abbia un credito da spendere: se ne ha
  // gia' uno (video guardato ma richiesta non partita) lo usa, altrimenti
  // mostra il video e aspetta che AdMob confermi la ricompensa al server.
  // Ritorna true se si puo' procedere con la richiesta AI.
  const ensureRewardCredit = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const status = await fetchRewardStatus();
      if (status.available > 0) return true;
      if (status.usedToday >= status.dailyLimit) {
        toast({
          variant: 'destructive',
          title: t('ai_suggester.error_title'),
          description: t('ai_suggester.reward_limit_reached', { limit: status.dailyLimit }),
        });
        return false;
      }

      setRewardPhase('watching');
      let earned = false;
      try {
        earned = await showRewardedAd(user.id);
      } catch {
        toast({ variant: 'destructive', title: t('ai_suggester.error_title'), description: t('ai_suggester.reward_no_ad') });
        return false;
      }
      if (!earned) {
        toast({ variant: 'destructive', title: t('ai_suggester.error_title'), description: t('ai_suggester.reward_not_earned') });
        return false;
      }

      // AdMob conferma il video al nostro server con una chiamata separata,
      // qualche secondo dopo: aspettiamo che il credito compaia.
      setRewardPhase('confirming');
      for (let attempt = 0; attempt < 12; attempt++) {
        const updated = await fetchRewardStatus();
        if (updated.available > 0) return true;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      toast({ title: t('ai_suggester.error_title'), description: t('ai_suggester.reward_pending') });
      return false;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('ai_suggester.error_title'),
        description: error.message || t('ai_suggester.error_desc'),
      });
      return false;
    } finally {
      setRewardPhase('idle');
    }
  };

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
    if (!hasActiveSubscription && !(await ensureRewardCredit())) return;
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
        if (body.code === 'reward_required') {
          throw new Error(t('ai_suggester.reward_pending'));
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
      // Il credito e' stato speso (o restituito dal server): aggiorniamo il
      // contatore dei video di oggi mostrato sotto il pulsante.
      if (!hasActiveSubscription && isNative) fetchRewardStatus().catch(() => {});
    }
  };

  const handleCloseBlockedDialog = () => {
    setIsBlockedDialogOpen(false);
    setConcept('');
  };

  // window.print() non ha effetto dentro la WebView Android dell'app (non e'
  // un vero browser: non c'e' un motore di stampa di sistema agganciato).
  // Generiamo quindi un PDF vero con jsPDF e lo passiamo a savePdf(), lo
  // stesso helper (e la stessa intestazione WAX PRO) gia' usati da
  // Calcolatore, Ricette e Magazzino: su nativo apre il foglio di
  // condivisione Android (da cui si puo' salvare, stampare o inviare), sul
  // web usa la Web Share API se disponibile o il download.
  const handlePrint = async () => {
    if (!conceptOptions || conceptOptions.length === 0) return;

    setIsPreparingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;
      const margin = 30;
      const maxY = doc.internal.pageSize.height - margin;
      const textWidth = pageWidth - margin * 2;
      let y = margin;

      const primaryColor = '#f97316';
      const textColor = '#111827';
      const mutedColor = '#6b7280';

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
        doc.text(t('ai_suggester.concept_result_title').toUpperCase(), titleX, y + 32, { charSpace: 1 });
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

      for (const option of conceptOptions) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const descLines: string[] = doc.splitTextToSize(option.description, textWidth);
        await ensureSpace(20 + descLines.length * 13 + 15 * 3 + option.fragrances.length * 14 + 30);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(textColor);
        doc.text(option.title, margin, y);
        y += 20;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(mutedColor);
        doc.text(descLines, margin, y);
        y += descLines.length * 13 + 8;

        doc.setFontSize(10);
        doc.setTextColor(textColor);
        doc.text(`${t('ai_suggester.top_note_label')}: ${option.topNote}`, margin, y);
        y += 15;
        doc.text(`${t('ai_suggester.heart_note_label')}: ${option.heartNote}`, margin, y);
        y += 15;
        doc.text(`${t('ai_suggester.base_note_label')}: ${option.baseNote}`, margin, y);
        y += 20;

        option.fragrances.forEach((f) => {
          doc.setTextColor(mutedColor);
          doc.text(f.name, margin + 6, y);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(primaryColor);
          doc.text(`${f.percentage}%`, pageWidth - margin - 6, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          y += 14;
        });

        y += 10;
        doc.setDrawColor('#d1d5db');
        doc.line(margin, y - 5, pageWidth - margin, y - 5);
        y += 12;
      }

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

  if (isSubscriptionLoading || !nativeChecked) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AccessDenied featureName={t('navbar.ai_suggester')} />;
  }

  // Fuori dall'app Android non ci sono video con ricompensa: resta il blocco
  // "solo abbonati".
  if (!hasActiveSubscription && !isNative) {
    return <ProFeatureDialog />;
  }

  const isBusy = isGeneratingConcept || rewardPhase !== 'idle';
  const generateLabel = isGeneratingConcept
    ? t('ai_suggester.generating')
    : rewardPhase === 'watching'
      ? t('ai_suggester.reward_watching')
      : rewardPhase === 'confirming'
        ? t('ai_suggester.reward_confirming')
        : hasActiveSubscription || (rewardStatus?.available ?? 0) > 0
          ? t('ai_suggester.concept_submit_button')
          : t('ai_suggester.reward_button');

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary flex-shrink-0" />
          <span className="min-w-0 break-words">{t('ai_suggester.title')}</span>
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
        <CardFooter className="flex flex-col items-start gap-3">
          <Button type="button" onClick={handleGenerateConcept} disabled={isBusy || !concept.trim()}>
            {isBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : !hasActiveSubscription && (rewardStatus?.available ?? 0) === 0 ? (
              <PlayCircle className="mr-2 h-4 w-4" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {generateLabel}
          </Button>
          {!hasActiveSubscription && (
            <p className="text-xs text-muted-foreground">
              {t('ai_suggester.reward_info', {
                used: rewardStatus?.usedToday ?? 0,
                limit: rewardStatus?.dailyLimit ?? 3,
              })}{' '}
              <Link href="/pricing" className="underline">
                {t('ai_suggester.reward_subscribe_link')}
              </Link>
            </p>
          )}
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
