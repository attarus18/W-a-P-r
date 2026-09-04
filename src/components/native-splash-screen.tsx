'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Su Android 12+ lo splash "on launch" (mostrato automaticamente dall'OS
 * all'avvio) e' un vincolo di piattaforma: solo icona + colore, mai
 * un'immagine intera -- vedi il commento in capacitor.config.ts. Per
 * mostrare davvero splash.png (logo + scritta WAX PRO) chiamiamo
 * SplashScreen.show() qui, al primo mount dell'app: non essendo "on
 * launch", il plugin usa la sua implementazione a overlay che rispetta
 * androidSplashResourceName/androidScaleType configurati staticamente.
 */
export default function NativeSplashScreen() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      try {
        await SplashScreen.show({
          autoHide: true,
          showDuration: 2000,
          fadeInDuration: 200,
          fadeOutDuration: 300,
        });
      } catch (err) {
        // Non blocchiamo l'app se lo splash non riesce a mostrarsi.
        console.error('Impossibile mostrare lo splash screen nativo:', err);
      }
    })();
  }, []);

  return null;
}
