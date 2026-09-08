
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator, Warehouse, BookMarked, Settings, Flame, PieChart, NotebookPen, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useLanguage } from '@/context/language-context';

export default function AppNavbar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: '/dashboard', icon: Flame, label: t('navbar.dashboard') },
    { href: '/calculator', icon: Calculator, label: t('navbar.calculator') },
    { href: '/recipe-calculator', icon: NotebookPen, label: t('navbar.recipe_calculator') },
    { href: '/inventory', icon: Warehouse, label: t('navbar.inventory') },
    { href: '/ai-suggester', icon: Sparkles, label: t('navbar.ai_suggester'), special: true },
    { href: '/report', icon: PieChart, label: t('navbar.report') },
    { href: '/recipes', icon: BookMarked, label: t('navbar.recipes') },
    { href: '/instructions', icon: BookOpen, label: t('navbar.instructions') },
    { href: '/settings', icon: Settings, label: t('navbar.settings') },
  ];

  return (
    <header
      className="fixed left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-t print:hidden"
      style={{ bottom: 'var(--admob-banner-offset, 0px)' }}
    >
        {/* overflow-x-auto + min-w-max sull'interno: se le icone non ci
            stanno tutte (schermi molto stretti, o piu' voci aggiunte in
            futuro) la barra scorre invece di tagliare silenziosamente
            l'ultima icona fuori dallo schermo. */}
        <nav className="container max-w-screen-2xl overflow-x-auto">
            <TooltipProvider>
                <div className="flex items-center justify-around gap-1 h-16 min-w-max">
                {navItems.map((item) => (
                <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                        <Link
                            href={item.href}
                            className={cn(
                            'flex shrink-0 items-center justify-center rounded-full h-10 w-10 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                            item.special
                              ? 'bg-primary text-primary-foreground shadow-md hover:opacity-90'
                              : cn(
                                  'rounded-lg text-muted-foreground hover:text-primary',
                                  pathname === item.href && 'bg-primary/10 text-primary'
                                )
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="sr-only">{item.label}</span>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{item.label}</p>
                    </TooltipContent>
                </Tooltip>
                ))}
                </div>
            </TooltipProvider>
        </nav>
    </header>
  );
}
