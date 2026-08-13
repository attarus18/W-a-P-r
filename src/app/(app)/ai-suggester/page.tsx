'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { suggestCandleMaterials, type SuggestCandleMaterialsInput, type SuggestCandleMaterialsOutput } from '@/ai/flows/suggest-candle-materials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import SuggestionCard from '@/components/ai/suggestion-card';
import { Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { useUser } from '@/context/auth-context';
import AccessDenied from '@/components/auth/access-denied';
import { useSubscription } from '@/context/subscription-context';
import ProFeatureDialog from '@/components/auth/pro-feature-dialog';


export default function AiSuggesterPage() {
  const { user, isUserLoading } = useUser();
  const { subscription, isSubscriptionLoading, hasActiveSubscription } = useSubscription();
  const [suggestions, setSuggestions] = useState<SuggestCandleMaterialsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<SuggestCandleMaterialsInput>({
    defaultValues: {
      candleType: '',
      fragrance: '',
      containerChoice: '',
    },
  });

  const onSubmit: SubmitHandler<SuggestCandleMaterialsInput> = async (data) => {
    setIsLoading(true);
    setSuggestions(null);
    try {
      const result = await suggestCandleMaterials(data);
      setSuggestions(result);
    } catch (error) {
      console.error("Errore nel recuperare i suggerimenti dall'IA:", error);
      toast({
        variant: "destructive",
        title: t('ai_suggester.error_title'),
        description: t('ai_suggester.error_description'),
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isUserLoading || isSubscriptionLoading) {
    return (
        <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }
  
  if (!user) {
    return <AccessDenied featureName={t('navbar.ai_suggester')} />;
  }

  // AI suggester is only for Pro and Annual plans.
  // Deny access if there's no active subscription at all, or if the plan is 'hobby'.
  if (!hasActiveSubscription || subscription?.subscriptionPlan === 'hobby') {
    return <ProFeatureDialog />;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wand2 className="h-8 w-8 text-primary" />
          {t('ai_suggester.title')}
        </h1>
        <p className="text-muted-foreground">{t('ai_suggester.description')}</p>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>{t('ai_suggester.form_title')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="candleType"
                rules={{ required: t('ai_suggester.candle_type_required') }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ai_suggester.candle_type_label')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t('ai_suggester.candle_type_placeholder')} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pillar">{t('ai_suggester.candle_type_pillar')}</SelectItem>
                        <SelectItem value="container">{t('ai_suggester.candle_type_container')}</SelectItem>
                        <SelectItem value="votive">{t('ai_suggester.candle_type_votive')}</SelectItem>
                        <SelectItem value="tealight">{t('ai_suggester.candle_type_tealight')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fragrance"
                rules={{ required: t('ai_suggester.fragrance_required') }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ai_suggester.fragrance_label')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('ai_suggester.fragrance_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="containerChoice"
                rules={{ required: t('ai_suggester.container_required') }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ai_suggester.container_label')}</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder={t('ai_suggester.container_placeholder')} /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="glass jar">{t('ai_suggester.container_glass_jar')}</SelectItem>
                        <SelectItem value="tin">{t('ai_suggester.container_tin')}</SelectItem>
                        <SelectItem value="ceramic">{t('ai_suggester.container_ceramic')}</SelectItem>
                        <SelectItem value="mold (freestanding)">{t('ai_suggester.container_mold')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('ai_suggester.loading_button')}
                  </>
                ) : (
                  t('ai_suggester.submit_button')
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {suggestions && (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">{t('ai_suggester.suggestions_title')}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {suggestions.suggestions.sort((a,b) => a.costEfficiencyRank - b.costEfficiencyRank).map((suggestion, index) => (
                    <SuggestionCard key={index} suggestion={suggestion} />
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
