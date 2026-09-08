
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator, Warehouse, BookMarked, Settings, PieChart, NotebookPen, BookOpen, Sparkles } from 'lucide-react';
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
      // translateZ(0) + will-change forzano un livello di compositing GPU
      // dedicato per questa barra: su alcune WebView Android, un elemento
      // "fixed" con backdrop-blur sopra un contenuto che scorre puo'
      // "staccarsi" temporaneamente durante lo scroll attivo (sparisce e poi
      // riappare) perche' il motore deve ricampionare lo sfondo sfocato a
      // ogni frame; isolarlo su un proprio layer evita il ricalcolo e tiene
      // la barra visibile e ferma durante lo scroll.
      style={{ bottom: 'var(--admob-banner-offset, 0px)', transform: 'translateZ(0)', willChange: 'transform' }}
    >
        <nav className="container flex items-center justify-around h-16 max-w-screen-2xl">
            <TooltipProvider>
                {navItems.map((item) => (
                <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                        <Link
                            href={item.href}
                            className={cn(
                            'flex items-center justify-center h-10 w-10 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                            item.special
                              ? 'rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90'
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
            </TooltipProvider>
        </nav>
    </header>
  );
}
