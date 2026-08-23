'use client';

import RecipeCard from '@/components/recipes/recipe-card';
import { Button } from '@/components/ui/button';
import { BookMarked, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { useRecipes } from '@/context/recipe-context';
import { useSubscription } from '@/context/subscription-context';
import { FREE_RECIPE_LIMIT } from '@/lib/constants';

export default function RecipesPage() {
  const { t } = useLanguage();
  const { recipes, isLoading } = useRecipes();
  const { hasActiveSubscription, isSubscriptionLoading } = useSubscription();

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
              ? t('recipes.recipe_count_unlimited', { count: recipes.length })
              : t('recipes.recipe_count_free', { count: recipes.length, limit: FREE_RECIPE_LIMIT })}
          </p>
        </div>
        <Button asChild>
          <Link href="/recipe-calculator">
            <BookMarked className="mr-2 h-4 w-4" />
            {t('recipes.go_to_calculator_button')}
          </Link>
        </Button>
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
