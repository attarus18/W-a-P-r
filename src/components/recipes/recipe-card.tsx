'use client';

import { useState } from 'react';
import type { Recipe } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { MoreVertical, Pencil, Trash2, Flame, Droplets, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditRecipeDialog from './edit-recipe-dialog';
import { useRecipes } from '@/context/recipe-context';

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const { updateRecipe, deleteRecipe } = useRecipes();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { t } = useLanguage();

  const handleUpdate = (values: { name: string; notes?: string }) => {
    updateRecipe({ ...recipe, ...values });
    setIsEditDialogOpen(false);
  };

  return (
    <Card className="flex flex-col transition-all hover:shadow-lg hover:shadow-primary/10">
      <CardHeader className="relative p-4 flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg">{recipe.name}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => setIsEditDialogOpen(true), 0);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                <span>{t('product_card.edit_button')}</span>
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>{t('recipes.delete_button')}</span>
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('recipes.delete_alert_title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('recipes.delete_alert_description')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('settings.alert_cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteRecipe(recipe.id)} className={cn(buttonVariants({ variant: "destructive" }))}>{t('recipes.delete_button')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
          <EditRecipeDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            recipe={recipe}
            onUpdateRecipe={handleUpdate}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-4 pt-0 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2 text-muted-foreground"><Flame className="h-4 w-4" /> {t('suggestion_card.wax')}:</span>
          <span className="font-semibold">{recipe.waxAmount} {recipe.unit}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2 text-muted-foreground"><Droplets className="h-4 w-4" /> {t('recipe_calculator.fragrance_amount')}:</span>
          <span className="font-semibold">{recipe.fragranceAmount} {recipe.unit}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="flex items-center gap-2 text-muted-foreground"><Palette className="h-4 w-4" /> {t('suggestion_card.color')}:</span>
          <span className="font-semibold">{recipe.colorAmount} {recipe.unit}</span>
        </div>
        {recipe.notes && (
          <p className="text-xs text-muted-foreground pt-2 border-t mt-2">{recipe.notes}</p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
        {t(`recipe_calculator.wax_${recipe.waxType}`)} · {recipe.totalWeight} {recipe.unit} · {recipe.fragrancePct}% {t('recipe_calculator.fragrance_label').toLowerCase()} · {recipe.colorPct}% {t('recipe_calculator.color_label').toLowerCase()}
      </CardFooter>
    </Card>
  );
}
