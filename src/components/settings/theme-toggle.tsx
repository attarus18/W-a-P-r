'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLanguage } from '@/context/language-context';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <ToggleGroup
      type="single"
      value={resolvedTheme}
      onValueChange={(value) => {
        if (value) setTheme(value);
      }}
      aria-label={t('settings.theme_title')}
    >
      <ToggleGroupItem value="light" aria-label={t('settings.theme_light')}>
        <Sun className="h-[1.8rem] w-[1.8rem]" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label={t('settings.theme_dark')}>
        <Moon className="h-[1.8rem] w-[1.8rem]" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
