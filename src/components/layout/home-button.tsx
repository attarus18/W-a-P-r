'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

// La Home e' stata tolta dalla barra in basso (per fare posto e non
// costringere la barra a scorrere) e spostata qui, fissa in alto a destra
// su ogni pagina.
export default function HomeButton() {
  const { t } = useLanguage();

  return (
    <Link
      href="/dashboard"
      className="fixed top-4 right-4 z-50 flex items-center justify-center h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border text-muted-foreground transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 print:hidden"
    >
      <Home className="h-5 w-5" />
      <span className="sr-only">{t('navbar.dashboard')}</span>
    </Link>
  );
}
