'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sparkles, Loader2, BookMarked, TriangleAlert, Wand2, Printer } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/auth-context';
import { useSubscription } from '@/context/subscription-context';
import { useRecipes } from '@/context/recipe-context';
import { createClient } from '@/lib/supabase/client';
import AccessDenied from '@/components/auth/access-denied';
import ProFeatureDialog from '@/components/auth/pro-feature-dialog';
import { WAX_TYPES, WAX_FRAGRANCE_PROFILES, DEFAULT_WAX_TYPE, type WaxType } from '@/lib/wax-types';

interface Suggestion {
  fragrancePct: number;
  colorPct: number;
  wickSuggestion: string;
  rationale: string;
  safetyNote: string;
}

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
  const { addRecipe } = useRecipes();
  const [supabase] = useState(() => createClient());

  const [productName, setProductName] = useState('');
  const [waxType, setWaxType] = useState<WaxType>(DEFAULT_WAX_TYPE);
  const [containerWeightG, setContainerWeightG] = useState(200);
  const [scentProfile, setScentProfile] = useState('');
  const [avoidColor, setAvoidColor] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const [concept, setConcept] = useState('');
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [conceptOptions, setConceptOptions] = useState<FragranceOption[] | null>(null);
  const [isBlockedDialogOpen, setIsBlockedDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSuggestion(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/suggest-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ waxType, containerWeightG, scentProfile, avoidColor, language }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(t('ai_suggester.rate_limit_error'));
        }
        throw new Error(body.error || t('ai_suggester.error_desc'));
      }
      setSuggestion(body.suggestion);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('ai_suggester.error_title'),
        description: error.message || t('ai_suggester.error_desc'),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToArchive = () => {
    if (!suggestion) return;
    const fragranceAmount = containerWeightG * (suggestion.fragrancePct / 100);
    const colorAmount = containerWeightG * (suggestion.colorPct / 100);
    const waxAmount = containerWeightG - fragranceAmount - colorAmount;

    addRecipe({
      name: productName || t('ai_suggester.default_recipe_name'),
      totalWeight: containerWeightG,
      unit: 'g',
      waxType,
      fragrancePct: suggestion.fragrancePct,
      colorPct: suggestion.colorPct,
      waxAmount: parseFloat(waxAmount.toFixed(2)),
      fragranceAmount: parseFloat(fragranceAmount.toFixed(2)),
      colorAmount: parseFloat(colorAmount.toFixed(2)),
      notes: [suggestion.wickSuggestion, suggestion.safetyNote].filter(Boolean).join(' — '),
    });
    toast({
      title: t('ai_suggester.save_success_title'),
      description: t('ai_suggester.save_success_desc'),
    });
  };

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

  const profile = WAX_FRAGRANCE_PROFILES[waxType];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          {t('ai_suggester.title')}
        </h1>
        <p className="text-muted-foreground">{t('ai_suggester.description')}</p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 items-start print:hidden">
        <TriangleAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">{t('ai_suggester.disclaimer')}</p>
      </div>

      <Tabs defaultValue="dosage">
        <TabsList className="grid w-full grid-cols-2 print:hidden">
          <TabsTrigger value="dosage">{t('ai_suggester.tab_dosage')}</TabsTrigger>
          <TabsTrigger value="concept">{t('ai_suggester.tab_concept')}</TabsTrigger>
        </TabsList>

        <TabsContent value="dosage" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('ai_suggester.form_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="productName">{t('ai_suggester.product_name_label')}</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={t('ai_suggester.product_name_placeholder')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="waxType">{t('recipe_calculator.wax_type_label')}</Label>
                  <Select value={waxType} onValueChange={(value) => setWaxType(value as WaxType)}>
                    <SelectTrigger id="waxType">
                      <SelectValue placeholder={t('recipe_calculator.wax_type_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {WAX_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{t(`recipe_calculator.wax_${type}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('ai_suggester.wax_profile_hint', { min: profile.min, max: profile.max })}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="containerWeightG">{t('ai_suggester.container_weight_label')}</Label>
                  <Input
                    id="containerWeightG"
                    type="number"
                    min="1"
                    step="1"
                    value={containerWeightG}
                    onChange={(e) => setContainerWeightG(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scentProfile">{t('ai_suggester.scent_profile_label')}</Label>
                <Textarea
                  id="scentProfile"
                  rows={2}
                  value={scentProfile}
                  onChange={(e) => setScentProfile(e.target.value)}
                  placeholder={t('ai_suggester.scent_profile_placeholder')}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="avoidColor" checked={avoidColor} onCheckedChange={(v) => setAvoidColor(v === true)} />
                <Label htmlFor="avoidColor" className="font-normal">{t('ai_suggester.avoid_color_label')}</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="button" onClick={handleGenerate} disabled={isGenerating || containerWeightG <= 0}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isGenerating ? t('ai_suggester.generating') : t('ai_suggester.submit_button')}
              </Button>
            </CardFooter>
          </Card>

          {suggestion && (
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle>{t('ai_suggester.result_title')}</CardTitle>
                <CardDescription>{suggestion.rationale}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-lg">
                  <span className="text-muted-foreground">{t('ai_suggester.fragrance_label')}</span>
                  <span className="font-bold text-primary">{suggestion.fragrancePct}%</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="text-muted-foreground">{t('ai_suggester.color_label')}</span>
                  <span className="font-bold text-primary">{suggestion.colorPct}%</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="text-muted-foreground">{t('ai_suggester.wick_label')}</span>
                  <span className="font-semibold text-right">{suggestion.wickSuggestion}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">{suggestion.safetyNote}</p>
              </CardContent>
              <CardFooter className="justify-center">
                <Button onClick={handleSaveToArchive}>
                  <BookMarked className="mr-2 h-4 w-4" />
                  {t('ai_suggester.save_button')}
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="concept" className="space-y-8">
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
            <div className="space-y-6">
              <div className="flex items-center justify-between print:hidden">
                <h2 className="text-xl font-semibold">{t('ai_suggester.concept_result_title')}</h2>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
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
        </TabsContent>
      </Tabs>

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
