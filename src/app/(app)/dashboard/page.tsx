'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NotebookPen, Calculator, Warehouse, BookMarked, Settings, PieChart, BookOpen } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/auth-context';


export default function DashboardPage() {
  const { t } = useLanguage();
  const { user } = useUser();

  const features = [
      {
        href: '/calculator',
        icon: Calculator,
        title: t('navbar.calculator'),
        description: t('dashboard.features.calculator'),
      },
      {
        href: '/recipe-calculator',
        icon: NotebookPen,
        title: t('navbar.recipe_calculator'),
        description: t('dashboard.features.recipe_calculator'),
      },
      {
        href: '/inventory',
        icon: Warehouse,
        title: t('navbar.inventory'),
        description: t('dashboard.features.inventory'),
      },
      {
        href: '/report',
        icon: PieChart,
        title: t('navbar.report'),
        description: t('dashboard.features.report'),
      },
      {
        href: '/recipes',
        icon: BookMarked,
        title: t('navbar.recipes'),
        description: t('dashboard.features.recipes'),
      },
      {
        href: '/settings',
        icon: Settings,
        title: t('navbar.settings'),
        description: t('dashboard.features.settings'),
      },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <img src="/logo.png" alt="WaxPro" className="h-10 w-10 rounded-full flex-shrink-0" />
          <h1 className="text-3xl sm:text-4xl font-bold text-primary tracking-wider whitespace-nowrap">WAX PRO</h1>
        </div>
        <p className="text-muted-foreground mt-2 max-w-xs mx-auto">{t('dashboard.welcome_subtitle')}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">{t('dashboard.how_it_works')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
              <Link href={feature.href} key={feature.href} className="block hover:scale-[1.02] transition-transform duration-200">
                <Card className="bg-card/50 border h-full">
                    <CardContent className="flex items-center gap-3 p-4 text-left">
                    <feature.icon className="h-6 w-6 text-primary flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                    </CardContent>
                </Card>
              </Link>
          ))}
           <Link href="/instructions" className="block hover:scale-[1.02] transition-transform duration-200 col-span-2 md:col-span-3">
              <Card className="bg-card/50 border h-full">
                  <CardContent className="flex items-center gap-3 p-4 text-left">
                  <BookOpen className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                      <h3 className="font-semibold text-foreground text-sm">{t('navbar.instructions')}</h3>
                      <p className="text-xs text-muted-foreground">{t('dashboard.features.instructions')}</p>
                  </div>
                  </CardContent>
              </Card>
            </Link>
        </div>
      </div>

      {!user && (
        <Card className="mt-8 p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{t('dashboard.register_title')}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.register_description')}</p>
          </div>
          <Button asChild>
            <Link href="/signup">{t('signup.signup_button')}</Link>
          </Button>
        </Card>
      )}
      
    </div>
  );
}
