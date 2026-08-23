'use client';

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLanguage } from '@/context/language-context';
import type { Recipe } from '@/lib/data';

type EditRecipeFormValues = Pick<Recipe, 'name' | 'notes'>;

interface EditRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
  onUpdateRecipe: (values: EditRecipeFormValues) => void;
}

export default function EditRecipeDialog({ open, onOpenChange, recipe, onUpdateRecipe }: EditRecipeDialogProps) {
  const { t } = useLanguage();
  const form = useForm<EditRecipeFormValues>({
    defaultValues: { name: recipe.name, notes: recipe.notes ?? '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: recipe.name, notes: recipe.notes ?? '' });
    }
  }, [open, recipe, form]);

  const onSubmit: SubmitHandler<EditRecipeFormValues> = (data) => {
    onUpdateRecipe(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('recipes.edit_title')}</DialogTitle>
          <DialogDescription>{t('recipes.edit_description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: t('recipes.name_required') }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recipes.name_label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('recipes.name_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('recipes.notes_label')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('recipes.notes_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">{t('settings.alert_cancel')}</Button>
              </DialogClose>
              <Button type="submit">{t('recipes.save_changes_button')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
