
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator, Warehouse, BookMarked, Settings, Flame, PieChart, NotebookPen, BookOpen } from 'lucide-react';
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
    { href: '/report', icon: PieChart, label: t('navbar.report') },
    { href: '/recipes', icon: BookMarked, label: t('navbar.recipes') },
    { href: '/instructions', icon: BookOpen, label: t('navbar.instructions') },
    { href: '/settings', icon: Settings, label: t('navbar.settings') },
  ];

  return (
    <header className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-t print:hidden">
        <nav className="container flex items-center justify-around h-16 max-w-screen-2xl">
            <TooltipProvider>
                {navItems.map((item) => (
                <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                        <Link
                            href={item.href}
                            className={cn(
                            'flex items-center justify-center rounded-lg h-10 w-10 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                            pathname === item.href && 'bg-primary/10 text-primary'
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
