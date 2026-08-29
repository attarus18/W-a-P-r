'use client';

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSubscription } from '@/context/subscription-context';
import { ADMOB_BANNER_AD_UNIT_ID } from '@/lib/admob';

let sdkInitialized = false;

// Banner mostrato in basso solo agli utenti senza abbonamento attivo (free,
// scaduto, o mai stato loading). In caso di errore/incertezza sul piano non
// mostriamo pubblicita' per non rischiare di infastidire un utente pagante.
export default function AdmobBanner() {
  const { isSubscriptionLoading, hasActiveSubscription } = useSubscription();
  const isShowingRef = useRef(false);
  // Letto dentro il listener SizeChanged (registrato una sola volta, sotto),
  // che altrimenti vedrebbe sempre il valore di hasActiveSubscription della
  // prima render: senza questo ref un evento SizeChanged residuo emesso
  // dall'SDK durante removeBanner() puo' arrivare DOPO che abbiamo gia'
  // azzerato l'offset e riscriverci sopra un valore vecchio, facendo
  // sparire la navbar in modo intermittente per un utente abbonato.
  const hasActiveSubscriptionRef = useRef(hasActiveSubscription);
  hasActiveSubscriptionRef.current = hasActiveSubscription;

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || isSubscriptionLoading) return;

    let cancelled = false;

    (async () => {
      const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
      if (cancelled) return;

      if (!sdkInitialized) {
        await AdMob.initialize();
        sdkInitialized = true;
      }
      if (cancelled) return;

      if (hasActiveSubscription) {
        // Chiamiamo removeBanner() sempre, non solo se isShowingRef.current:
        // dopo un location.reload() (es. subito dopo un acquisto) il modulo
        // JS riparte da zero e isShowingRef torna false, ma la view nativa
        // del banner sopravvive al reload della sola pagina web e resta
        // visibile -- nascondendo anche la navbar sotto di se'. removeBanner()
        // su un banner gia' assente e' un no-op innocuo lato plugin.
        try {
          await AdMob.removeBanner();
        } catch {
          // nessun banner da rimuovere: va bene cosi'.
        }
        isShowingRef.current = false;
        document.documentElement.style.setProperty('--admob-banner-offset', '0px');
        return;
      }

      if (!isShowingRef.current) {
        await AdMob.showBanner({
          adId: ADMOB_BANNER_AD_UNIT_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
        });
        isShowingRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSubscriptionLoading, hasActiveSubscription]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const { AdMob, BannerAdPluginEvents } = await import('@capacitor-community/admob');
      const registered = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
        if (hasActiveSubscriptionRef.current) return;
        document.documentElement.style.setProperty('--admob-banner-offset', `${size.height}px`);
      });
      if (cancelled) {
        registered.remove();
      } else {
        handle = registered;
      }
    })();

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, []);

  return null;
}
