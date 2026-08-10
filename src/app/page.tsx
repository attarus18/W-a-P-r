'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * RootPage gestisce il reindirizzamento iniziale.
 * Utilizziamo un approccio client-side per migliorare la compatibilità
 * con il server di sviluppo e le WebView durante il caricamento iniziale.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Reindirizzamento alla dashboard come punto di ingresso principale
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Caricamento WaxPro...</p>
      </div>
    </div>
  );
}
