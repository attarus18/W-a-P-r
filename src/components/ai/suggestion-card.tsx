'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SuggestCandleMaterialsOutput } from "@/ai/flows/suggest-candle-materials";
import { Award } from 'lucide-react';
import { useLanguage } from "@/context/language-context";

type Suggestion = SuggestCandleMaterialsOutput['suggestions'][0];

interface SuggestionCardProps {
  suggestion: Suggestion;
}

export default function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const { t } = useLanguage();
  
  const rankMap: {[key: number]: { text: string; className: string }} = {
      1: { text: t('suggestion_card.most_convenient'), className: "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"},
      2: { text: t('suggestion_card.balanced_cost'), className: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"},
      3: { text: t('suggestion_card.premium_quality'), className: "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30"},
  };

  const rankInfo = rankMap[suggestion.costEfficiencyRank] || { text: 'Standard', className: 'bg-muted'};

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{t('suggestion_card.option')} #{suggestion.costEfficiencyRank}</CardTitle>
            <Badge variant="outline" className={rankInfo.className}>
                <Award className="mr-1 h-3 w-3" /> {rankInfo.text}
            </Badge>
        </div>
        <CardDescription>{t('suggestion_card.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div>
            <h4 className="font-semibold text-sm">{t('suggestion_card.wax')}:</h4>
            <p className="text-muted-foreground">{suggestion.wax}</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm">{t('suggestion_card.wick')}:</h4>
            <p className="text-muted-foreground">{suggestion.wick}</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm">{t('suggestion_card.color')}:</h4>
            <p className="text-muted-foreground">{suggestion.color}</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm">{t('suggestion_card.reasoning')}:</h4>
            <p className="text-muted-foreground text-xs">{suggestion.reasoning}</p>
        </div>
      </CardContent>
    </Card>
  );
}
