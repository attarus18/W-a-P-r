'use client';

import { useMemo, useRef, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Loader2, TriangleAlert, FileSearch, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useMaterials } from '@/context/materials-context';
import { useUser } from '@/context/auth-context';
import { useSubscription } from '@/context/subscription-context';
import AccessDenied from '@/components/auth/access-denied';
import ProFeatureDialog from '@/components/auth/pro-feature-dialog';
import { GhsPictogram, getGhsPictogramDataUrl, GHS_PICTOGRAM_TYPES, type GhsPictogramType } from '@/lib/ghs-pictograms';
import { drawArcTextTop } from '@/lib/pdf-arc-text';
import { wrapTextToCircle } from '@/lib/circle-text-wrap';
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
  const { user } = useUser();
  const { hasActiveSubscription, isSubscriptionLoading } = useSubscription();
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedPictograms, setSelectedPictograms] = useState<GhsPictogramType[]>([]);
  const [waxSelectMode, setWaxSelectMode] = useState('other');
  const [labelShape, setLabelShape] = useState<'rectangle' | 'circle'>('rectangle');
  const [rectWidthMm, setRectWidthMm] = useState(80);
  const [rectHeightMm, setRectHeightMm] = useState(50);
  const [circleDiameterMm, setCircleDiameterMm] = useState(40);

  // Posizione/scala del contenuto scelte a mano trascinando con un dito e
  // "pizzicando" con due nell'anteprima; finche' l'utente non tocca
  // l'anteprima, il PDF continua a centrare e ridimensionare tutto da solo.
  const [manualScale, setManualScale] = useState(1);
  const [offsetMm, setOffsetMm] = useState({ x: 0, y: 0 });
  const [hasManualPosition, setHasManualPosition] = useState(false);
  const stagePointers = useRef(new Map<number, { x: number; y: number }>());
  const gestureStart = useRef<{ dist: number; scale: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const shapeWidthMm = labelShape === 'circle' ? circleDiameterMm : rectWidthMm;
  const shapeHeightMm = labelShape === 'circle' ? circleDiameterMm : rectHeightMm;
  const pxPerMm = useMemo(() => {
    const maxDim = Math.max(shapeWidthMm, shapeHeightMm, 1);
    return Math.min(4, 260 / maxDim);
  }, [shapeWidthMm, shapeHeightMm]);

  const clampScale = (value: number) => Math.min(2.5, Math.max(0.3, value));

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget).setPointerCapture(e.pointerId);
    stagePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setHasManualPosition(true);
    if (stagePointers.current.size === 2) {
      const pts = Array.from(stagePointers.current.values());
      gestureStart.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        scale: manualScale,
        x: 0,
        y: 0,
        offsetX: offsetMm.x,
        offsetY: offsetMm.y,
      };
    } else {
      gestureStart.current = { dist: 0, scale: manualScale, x: e.clientX, y: e.clientY, offsetX: offsetMm.x, offsetY: offsetMm.y };
    }
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stagePointers.current.has(e.pointerId) || !gestureStart.current) return;
    stagePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (stagePointers.current.size === 2) {
      const pts = Array.from(stagePointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / (gestureStart.current.dist || 1);
      setManualScale(clampScale(gestureStart.current.scale * ratio));
    } else if (stagePointers.current.size === 1) {
      const dx = (e.clientX - gestureStart.current.x) / pxPerMm;
      const dy = (e.clientY - gestureStart.current.y) / pxPerMm;
      setOffsetMm({ x: gestureStart.current.offsetX + dx, y: gestureStart.current.offsetY + dy });
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    stagePointers.current.delete(e.pointerId);
    gestureStart.current = null;
  };

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setHasManualPosition(true);
    setManualScale((prev) => clampScale(prev - e.deltaY * 0.01));
  };

  const resetPosition = () => {
    setHasManualPosition(false);
    setManualScale(1);
    setOffsetMm({ x: 0, y: 0 });
  };

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

  interface PreviewLine {
    text: string;
    y: number;
    fontSize: number;
    bold?: boolean;
    color?: string;
    mono?: boolean;
  }

  // Righe centrate e "ristrette" per seguire la corda del cerchio, cosi'
  // l'anteprima su schermo assomiglia gia' a un'etichetta tonda finita
  // invece di una fascia rettangolare: stessa logica di wrapTextToCircle
  // usata per il PDF, solo con una stima di larghezza più economica (va
  // bene per un'anteprima, non serve la precisione di jsPDF).
  const buildCircleLines = (radius: number) => {
    let y = -radius * 0.62;
    const lines: PreviewLine[] = [];

    lines.push({
      text: [
        values.waxTypeName ? t('label_clp.subtitle_wax', { wax: values.waxTypeName }) : '',
        t('label_clp.subtitle_fragrance', { percent: values.fragrancePercent || 0 }),
      ].filter(Boolean).join(' · '),
      y,
      fontSize: 7,
      color: '#6b7280',
    });
    y += 12;

    lines.push({ text: `${t('label_clp.net_weight_label')}: ${values.netWeight || 0} g`, y, fontSize: 8, bold: true });
    y += 14;

    let pictogramsY: number | null = null;
    if (selectedPictograms.length > 0) {
      pictogramsY = y;
      y += 30;
    }

    const measure = (str: string) => str.length * 3.6;

    if (values.hPhrases) {
      const wrapped = wrapTextToCircle(values.hPhrases, measure, radius, 8, y);
      wrapped.lines.forEach((l) => lines.push({ text: l.text, y: l.y, fontSize: 6 }));
      y = wrapped.endY + 4;
    }
    if (values.pPhrases) {
      const wrapped = wrapTextToCircle(values.pPhrases, measure, radius, 8, y);
      wrapped.lines.forEach((l) => lines.push({ text: l.text, y: l.y, fontSize: 6 }));
      y = wrapped.endY + 4;
    }
    if (values.allergens) {
      const wrapped = wrapTextToCircle(`${t('label_clp.allergens_label')}: ${values.allergens}`, measure, radius, 8, y);
      wrapped.lines.forEach((l) => lines.push({ text: l.text, y: l.y, fontSize: 6, bold: true }));
      y = wrapped.endY + 4;
    }
    if (values.ufiCode) {
      lines.push({ text: `UFI: ${values.ufiCode}`, y, fontSize: 6, mono: true });
      y += 9;
    }
    if (values.companyName) {
      lines.push({ text: values.companyName, y, fontSize: 6, bold: true });
      y += 8;
    }
    if (values.companyAddress) {
      lines.push({ text: values.companyAddress, y, fontSize: 6, color: '#6b7280' });
      y += 8;
    }
    if (values.companyEmail) {
      lines.push({ text: values.companyEmail, y, fontSize: 6, color: '#6b7280' });
      y += 8;
    }

    return { lines, pictogramsY };
  };

  const handleGeneratePdf = async () => {
    setIsPrinting(true);
    try {
      const pictogramDataUrls: Partial<Record<GhsPictogramType, string>> = {};
      for (const type of selectedPictograms) {
        pictogramDataUrls[type] = await getGhsPictogramDataUrl(type);
      }

      const doc = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const pageWidth = doc.internal.pageSize.width;

      const textColor = '#111827';
      const mutedColor = '#6b7280';

      const MM_TO_PX = 96 / 25.4;
      const isCircle = labelShape === 'circle';
      const shapeWidthPx = isCircle ? circleDiameterMm * MM_TO_PX : rectWidthMm * MM_TO_PX;
      const shapeHeightPx = isCircle ? circleDiameterMm * MM_TO_PX : rectHeightMm * MM_TO_PX;

      const innerPadding = 14;
      // Il cerchio ammette testo solo in un quadrato inscritto (altrimenti gli
      // angoli del blocco di testo uscirebbero dal contorno); 0.68 lascia un
      // piccolo margine di sicurezza rispetto al vero inscritto (0.707).
      const circleFactor = 0.68;
      const contentWidth = isCircle ? shapeWidthPx * circleFactor : Math.max(shapeWidthPx - innerPadding * 2, 40);
      const availableHeight = isCircle ? shapeHeightPx * circleFactor : Math.max(shapeHeightPx - innerPadding * 2, 40);

      // Disegna (o solo misura, per trovare la scala del testo che ci sta) il
      // contenuto dell'etichetta a partire da (startX, startY), con font e
      // interlinee scalate da `scale`. Ritorna la y finale, utile sia per
      // calcolare l'altezza occupata sia per centrare verticalmente il blocco.
      const renderLabel = (scale: number, mode: 'measure' | 'draw', startX: number, startY: number): number => {
        const s = (v: number) => v * scale;
        let y = startY;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(s(16));
        if (mode === 'draw') {
          doc.setTextColor(textColor);
          doc.text(values.productName || '-', startX, y);
        }
        y += s(16);

        const subtitleParts = [
          values.waxTypeName ? t('label_clp.subtitle_wax', { wax: values.waxTypeName }) : '',
          t('label_clp.subtitle_fragrance', { percent: values.fragrancePercent || 0 }),
        ].filter(Boolean);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(s(10));
        if (mode === 'draw') {
          doc.setTextColor(mutedColor);
          doc.text(subtitleParts.join(' · '), startX, y);
        }
        y += s(22);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(s(9));
        if (mode === 'draw') {
          doc.setTextColor(mutedColor);
          doc.text(t('label_clp.net_weight_label').toUpperCase(), startX, y);
          doc.setFontSize(s(13));
          doc.setTextColor(textColor);
          doc.text(`${values.netWeight || 0} g`, startX + contentWidth, y, { align: 'right' });
        }
        y += s(20);

        if (selectedPictograms.length > 0) {
          y += s(20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(s(10));
          if (mode === 'draw') {
            doc.setTextColor(textColor);
            doc.text(t('label_clp.warning_label').toUpperCase(), startX, y - s(8));
          }
          const iconSize = s(36);
          const gap = s(6);
          if (mode === 'draw') {
            let px = startX;
            selectedPictograms.forEach((type) => {
              const url = pictogramDataUrls[type];
              if (url) doc.addImage(url, 'PNG', px, y, iconSize, iconSize);
              px += iconSize + gap;
            });
          }
          y += iconSize + s(12);
        }

        if (values.hPhrases) {
          y += s(16);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(s(9));
          if (mode === 'draw') {
            doc.setTextColor(mutedColor);
            doc.text(t('label_clp.h_phrases_label').toUpperCase(), startX, y);
          }
          y += s(12);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(s(9));
          const lines = doc.splitTextToSize(values.hPhrases, contentWidth);
          if (mode === 'draw') {
            doc.setTextColor(textColor);
            doc.text(lines, startX, y);
          }
          y += lines.length * s(11) + s(10);
        }

        if (values.pPhrases) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(s(9));
          if (mode === 'draw') {
            doc.setTextColor(mutedColor);
            doc.text(t('label_clp.p_phrases_label').toUpperCase(), startX, y);
          }
          y += s(12);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(s(9));
          const lines = doc.splitTextToSize(values.pPhrases, contentWidth);
          if (mode === 'draw') {
            doc.setTextColor(textColor);
            doc.text(lines, startX, y);
          }
          y += lines.length * s(11) + s(10);
        }

        if (values.allergens) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(s(9));
          const allergenLines = doc.splitTextToSize(`${t('label_clp.allergens_label')}: ${values.allergens}`, contentWidth);
          if (mode === 'draw') {
            doc.setTextColor(textColor);
            doc.text(allergenLines, startX, y);
          }
          y += allergenLines.length * s(11) + s(8);
        }

        if (values.ufiCode) {
          doc.setFont('courier', 'normal');
          doc.setFontSize(s(9));
          if (mode === 'draw') {
            doc.setTextColor(textColor);
            doc.text(`UFI: ${values.ufiCode}`, startX, y);
          }
          y += s(18);
        }

        if (values.companyName || values.companyAddress || values.companyEmail) {
          y += s(16);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(s(9));
          if (values.companyName) {
            if (mode === 'draw') {
              doc.setTextColor(textColor);
              doc.text(values.companyName, startX, y);
            }
            y += s(12);
          }
          doc.setFont('helvetica', 'normal');
          if (values.companyAddress) {
            if (mode === 'draw') {
              doc.setTextColor(mutedColor);
              doc.text(values.companyAddress, startX, y);
            }
            y += s(12);
          }
          if (values.companyEmail) {
            if (mode === 'draw') {
              doc.setTextColor(mutedColor);
              doc.text(values.companyEmail, startX, y);
            }
            y += s(12);
          }
        }

        return y - startY;
      };

      // Layout dedicato al cerchio: nome prodotto ad arco lungo il bordo
      // superiore (come su un coperchio di barattolo) e il resto centrato,
      // con i paragrafi lunghi (frasi H/P, allergeni) che si restringono
      // riga per riga seguendo la corda del cerchio invece di restare una
      // fascia rettangolare. Ritorna l'estensione verticale occupata,
      // relativa al centro, per il calcolo automatico della scala.
      const renderCircularLabel = (
        scale: number,
        mode: 'measure' | 'draw',
        centerX: number,
        centerY: number,
        radius: number
      ): number => {
        const s = (v: number) => v * scale;
        const measureWidth = (str: string) => doc.getTextWidth(str);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(s(15));
        if (mode === 'draw' && values.productName) {
          doc.setTextColor(textColor);
          drawArcTextTop(doc, values.productName.toUpperCase(), centerX, centerY, radius * 0.88);
        }

        let y = -radius * 0.62;

        const subtitleParts = [
          values.waxTypeName ? t('label_clp.subtitle_wax', { wax: values.waxTypeName }) : '',
          t('label_clp.subtitle_fragrance', { percent: values.fragrancePercent || 0 }),
        ].filter(Boolean);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(s(8));
        if (mode === 'draw') {
          doc.setTextColor(mutedColor);
          doc.text(subtitleParts.join(' · '), centerX, centerY + y, { align: 'center' });
        }
        y += s(14);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(s(10));
        if (mode === 'draw') {
          doc.setTextColor(textColor);
          doc.text(`${t('label_clp.net_weight_label')}: ${values.netWeight || 0} g`, centerX, centerY + y, { align: 'center' });
        }
        y += s(16);

        if (selectedPictograms.length > 0) {
          const iconSize = s(28);
          const gap = s(6);
          const totalWidth = selectedPictograms.length * iconSize + (selectedPictograms.length - 1) * gap;
          if (mode === 'draw') {
            let px = centerX - totalWidth / 2;
            selectedPictograms.forEach((type) => {
              const url = pictogramDataUrls[type];
              if (url) doc.addImage(url, 'PNG', px, centerY + y, iconSize, iconSize);
              px += iconSize + gap;
            });
          }
          y += iconSize + s(10);
        }

        if (values.hPhrases) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(s(7));
          const { lines, endY } = wrapTextToCircle(values.hPhrases, measureWidth, radius, s(9), y);
          if (mode === 'draw') {
            doc.setTextColor(textColor);
            lines.forEach((line) => doc.text(line.text, centerX, centerY + line.y, { align: 'center' }));
          }
          y = endY + s(4);
        }

        if (values.pPhrases) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(s(7));
          const { lines, endY } = wrapTextToCircle(values.pPhrases, measureWidth, radius, s(9), y);
          if (mode === 'draw') {
            doc.setTextColor(textColor);
            lines.forEach((line) => doc.text(line.text, centerX, centerY + line.y, { align: 'center' }));
          }
          y = endY + s(4);
        }

        if (values.allergens) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(s(7));
          const { lines, endY } = wrapTextToCircle(`${t('label_clp.allergens_label')}: ${values.allergens}`, measureWidth, radius, s(9), y);
          if (mode === 'draw') {
            doc.setTextColor(textColor);
            lines.forEach((line) => doc.text(line.text, centerX, centerY + line.y, { align: 'center' }));
          }
          y = endY + s(4);
        }

        if (values.ufiCode) {
          doc.setFont('courier', 'normal');
          doc.setFontSize(s(7));
          if (mode === 'draw') {
            doc.setTextColor(textColor);
            doc.text(`UFI: ${values.ufiCode}`, centerX, centerY + y, { align: 'center' });
          }
          y += s(11);
        }

        if (values.companyName || values.companyAddress || values.companyEmail) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(s(7));
          if (values.companyName) {
            if (mode === 'draw') {
              doc.setTextColor(textColor);
              doc.text(values.companyName, centerX, centerY + y, { align: 'center' });
            }
            y += s(9);
          }
          doc.setFont('helvetica', 'normal');
          if (values.companyAddress) {
            if (mode === 'draw') {
              doc.setTextColor(mutedColor);
              doc.text(values.companyAddress, centerX, centerY + y, { align: 'center' });
            }
            y += s(9);
          }
          if (values.companyEmail) {
            if (mode === 'draw') {
              doc.setTextColor(mutedColor);
              doc.text(values.companyEmail, centerX, centerY + y, { align: 'center' });
            }
            y += s(9);
          }
        }

        return y;
      };

      let chosenScale: number;
      let offsetXpx: number;
      let offsetYpx: number;

      if (isCircle) {
        const radius = shapeWidthPx / 2;

        if (hasManualPosition) {
          chosenScale = manualScale;
          offsetXpx = offsetMm.x * MM_TO_PX;
          offsetYpx = offsetMm.y * MM_TO_PX;
        } else {
          // Cerca la scala piu' grande che ci sta: cosi' un'etichetta grande
          // con poco contenuto usa un testo proporzionalmente piu' grande
          // invece di restare pinnato piccolo indipendentemente dal diametro.
          const candidateScales = [2, 1.75, 1.5, 1.25, 1, 0.9, 0.8, 0.7, 0.6, 0.5];
          chosenScale = candidateScales[candidateScales.length - 1];
          for (const candidate of candidateScales) {
            const bottomY = renderCircularLabel(candidate, 'measure', 0, 0, radius);
            if (bottomY <= radius * 0.88) {
              chosenScale = candidate;
              break;
            }
          }
          offsetXpx = 0;
          offsetYpx = 0;
        }

        const bottomY = renderCircularLabel(chosenScale, 'measure', 0, 0, radius);
        const overflow = bottomY > radius * 0.88;

        const shapeX = (pageWidth - shapeWidthPx) / 2;
        const shapeY = 40;
        const centerX = shapeX + shapeWidthPx / 2 + offsetXpx;
        const centerY = shapeY + shapeHeightPx / 2 + offsetYpx;

        doc.setDrawColor('#9ca3af');
        doc.setLineWidth(1);
        doc.setLineDashPattern([4, 3], 0);
        doc.circle(shapeX + shapeWidthPx / 2, shapeY + shapeHeightPx / 2, radius, 'S');
        doc.setLineDashPattern([], 0);

        renderCircularLabel(chosenScale, 'draw', centerX, centerY, radius);

        if (overflow) {
          toast({
            variant: 'destructive',
            title: t('label_clp.overflow_warning'),
          });
        }

        await savePdf(doc, 'waxpro-etichetta-clp.pdf');
        return;
      }

      if (hasManualPosition) {
        // L'utente ha gia' trascinato/pizzicato l'anteprima: usa esattamente
        // quella posizione e scala invece di ricalcolarle da zero.
        chosenScale = manualScale;
        offsetXpx = offsetMm.x * MM_TO_PX;
        offsetYpx = offsetMm.y * MM_TO_PX;
      } else {
        // Cerca la scala piu' grande che ci sta nell'area disponibile: un
        // rettangolo grande con poco contenuto ottiene cosi' un testo
        // proporzionalmente piu' grande, che segue le misure date invece di
        // restare pinnato alla stessa dimensione qualunque sia il formato.
        // Se il contenuto e' troppo per il rettangolo, si rimpicciolisce
        // finche' non ci sta.
        const candidateScales = [2, 1.75, 1.5, 1.25, 1, 0.9, 0.8, 0.7, 0.6, 0.5];
        chosenScale = candidateScales[candidateScales.length - 1];
        for (const candidate of candidateScales) {
          const h = renderLabel(candidate, 'measure', 0, 0);
          if (h <= availableHeight) {
            chosenScale = candidate;
            break;
          }
        }
        offsetXpx = 0;
        offsetYpx = 0;
      }

      const usedHeight = renderLabel(chosenScale, 'measure', 0, 0);
      const overflow = usedHeight > availableHeight;

      const shapeX = (pageWidth - shapeWidthPx) / 2;
      const shapeY = 40;

      doc.setDrawColor('#9ca3af');
      doc.setLineWidth(1);
      doc.setLineDashPattern([4, 3], 0);
      doc.rect(shapeX, shapeY, shapeWidthPx, shapeHeightPx, 'S');
      doc.setLineDashPattern([], 0);

      const contentStartX = shapeX + shapeWidthPx / 2 + offsetXpx - contentWidth / 2;
      const contentStartY = shapeY + shapeHeightPx / 2 + offsetYpx - usedHeight / 2;

      renderLabel(chosenScale, 'draw', contentStartX, contentStartY);

      if (overflow) {
        toast({
          variant: 'destructive',
          title: t('label_clp.overflow_warning'),
        });
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

  if (isSubscriptionLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AccessDenied featureName={t('navbar.label_clp')} />;
  }

  if (!hasActiveSubscription) {
    return <ProFeatureDialog />;
  }

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

      <Card>
        <CardHeader>
          <CardTitle>{t('label_clp.format_title')}</CardTitle>
          <CardDescription>{t('label_clp.format_description')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>{t('label_clp.shape_label')}</Label>
            <Select value={labelShape} onValueChange={(v) => setLabelShape(v as 'rectangle' | 'circle')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">{t('label_clp.shape_rectangle')}</SelectItem>
                <SelectItem value="circle">{t('label_clp.shape_circle')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {labelShape === 'rectangle' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="rectWidthMm">{t('label_clp.rect_width_label')}</Label>
                <Input
                  id="rectWidthMm"
                  type="number"
                  min="10"
                  step="1"
                  value={rectWidthMm}
                  onChange={(e) => setRectWidthMm(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rectHeightMm">{t('label_clp.rect_height_label')}</Label>
                <Input
                  id="rectHeightMm"
                  type="number"
                  min="10"
                  step="1"
                  value={rectHeightMm}
                  onChange={(e) => setRectHeightMm(parseFloat(e.target.value) || 0)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="circleDiameterMm">{t('label_clp.diameter_label')}</Label>
              <Input
                id="circleDiameterMm"
                type="number"
                min="10"
                step="1"
                value={circleDiameterMm}
                onChange={(e) => setCircleDiameterMm(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
        </CardContent>
      </Card>

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
            <CardDescription>{t('label_clp.position_hint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div
              className="relative mx-auto shrink-0"
              style={{
                width: shapeWidthMm * pxPerMm,
                height: shapeHeightMm * pxPerMm,
                borderRadius: labelShape === 'circle' ? '50%' : '6px',
                border: '2px dashed #9ca3af',
                background: '#ffffff',
                touchAction: 'none',
                cursor: 'grab',
              }}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              onPointerCancel={handleStagePointerUp}
              onWheel={handleStageWheel}
            >
              {labelShape === 'circle' ? (() => {
                const stagePx = shapeWidthMm * pxPerMm;
                const r = stagePx / 2;
                const titleRadius = r * 0.85;
                const startAngle = (-85 * Math.PI) / 180;
                const endAngle = (85 * Math.PI) / 180;
                const x1 = r + titleRadius * Math.sin(startAngle);
                const y1 = r - titleRadius * Math.cos(startAngle);
                const x2 = r + titleRadius * Math.sin(endAngle);
                const y2 = r - titleRadius * Math.cos(endAngle);
                const arcPath = `M ${x1} ${y1} A ${titleRadius} ${titleRadius} 0 0 1 ${x2} ${y2}`;
                const { lines, pictogramsY } = buildCircleLines(r);

                return (
                  <div
                    className="absolute select-none"
                    style={{
                      top: '50%',
                      left: '50%',
                      width: stagePx,
                      height: stagePx,
                      transform: `translate(${offsetMm.x * pxPerMm}px, ${offsetMm.y * pxPerMm}px) translate(-50%, -50%) scale(${manualScale})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <svg width={stagePx} height={stagePx} viewBox={`0 0 ${stagePx} ${stagePx}`} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
                      <path id="clpPreviewTitleArc" d={arcPath} fill="none" stroke="none" />
                      <text fontSize={Math.max(stagePx * 0.075, 8)} fontWeight="bold" fill="#111827">
                        <textPath href="#clpPreviewTitleArc" startOffset="50%" textAnchor="middle">
                          {(values.productName || t('label_clp.preview_placeholder_name')).toUpperCase()}
                        </textPath>
                      </text>
                    </svg>
                    {lines.map((line, i) => (
                      <p
                        key={i}
                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
                        style={{
                          top: r + line.y,
                          fontSize: line.fontSize,
                          fontWeight: line.bold ? 700 : 400,
                          color: line.color || '#111827',
                          fontFamily: line.mono ? 'monospace' : undefined,
                        }}
                      >
                        {line.text}
                      </p>
                    ))}
                    {pictogramsY !== null && (
                      <div className="absolute left-1/2 flex -translate-x-1/2 gap-1" style={{ top: r + pictogramsY }}>
                        {selectedPictograms.map((p) => <GhsPictogram key={p} type={p} size={20} />)}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div
                  className="absolute space-y-1 select-none"
                  style={{
                    top: '50%',
                    left: '50%',
                    width: shapeWidthMm * pxPerMm * 0.85,
                    transform: `translate(${offsetMm.x * pxPerMm}px, ${offsetMm.y * pxPerMm}px) translate(-50%, -50%) scale(${manualScale})`,
                    transformOrigin: 'center center',
                    color: '#111827',
                  }}
                >
                  <div>
                    <p className="font-bold text-[11px] leading-tight">{values.productName || t('label_clp.preview_placeholder_name')}</p>
                    <p className="text-[8px] leading-tight" style={{ color: '#6b7280' }}>
                      {[
                        values.waxTypeName ? t('label_clp.subtitle_wax', { wax: values.waxTypeName }) : '',
                        t('label_clp.subtitle_fragrance', { percent: values.fragrancePercent || 0 }),
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[8px]" style={{ color: '#6b7280' }}>
                    <span>{t('label_clp.net_weight_label')}</span>
                    <span className="font-semibold" style={{ color: '#111827' }}>{values.netWeight || 0} g</span>
                  </div>

                  {selectedPictograms.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-bold text-[8px]">{t('label_clp.warning_label')}</span>
                      <div className="flex gap-1 flex-wrap">
                        {selectedPictograms.map((p) => <GhsPictogram key={p} type={p} size={20} />)}
                      </div>
                    </div>
                  )}

                  {values.hPhrases && (
                    <p className="text-[7px] leading-tight whitespace-pre-line">{values.hPhrases}</p>
                  )}

                  {values.pPhrases && (
                    <p className="text-[7px] leading-tight whitespace-pre-line">{values.pPhrases}</p>
                  )}

                  {values.allergens && (
                    <p className="text-[7px] leading-tight">{t('label_clp.allergens_label')}: {values.allergens}</p>
                  )}

                  {values.ufiCode && (
                    <p className="text-[7px] font-mono">UFI: {values.ufiCode}</p>
                  )}

                  {(values.companyName || values.companyAddress || values.companyEmail) && (
                    <div className="text-[7px] leading-tight" style={{ color: '#6b7280' }}>
                      {values.companyName && <p className="font-semibold" style={{ color: '#111827' }}>{values.companyName}</p>}
                      {values.companyAddress && <p>{values.companyAddress}</p>}
                      {values.companyEmail && <p>{values.companyEmail}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" onClick={() => { setHasManualPosition(true); setManualScale((s) => clampScale(s - 0.1)); }}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={() => { setHasManualPosition(true); setManualScale((s) => clampScale(s + 0.1)); }}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={resetPosition}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('label_clp.reset_position')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
