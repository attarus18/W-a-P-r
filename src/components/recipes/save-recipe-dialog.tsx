'use client';

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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLanguage } from '@/context/language-context';

type SaveRecipeFormValues = {
  name: string;
  notes: string;
};

interface SaveRecipeDialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: SaveRecipeFormValues) => void;
}

export default function SaveRecipeDialog({ children, open, onOpenChange, onSave }: SaveRecipeDialogProps) {
  const { t } = useLanguage();
  const form = useForm<SaveRecipeFormValues>({
    defaultValues: { name: '', notes: '' },
  });

  const onSubmit: SubmitHandler<SaveRecipeFormValues> = (data) => {
    onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        form.reset();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('recipes.save_dialog_title')}</DialogTitle>
          <DialogDescription>{t('recipes.save_dialog_description')}</DialogDescription>
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
              <Button type="submit">{t('recipes.save_button')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
