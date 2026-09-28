import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { ADMOB_REWARDED_AD_UNIT_ID } from '@/lib/admob';

let sdkInitialized = false;

// I video con ricompensa esistono solo nell'app Android (plugin nativo AdMob).
export const isRewardedAdSupported = () => Capacitor.isNativePlatform();

// Mostra un video con ricompensa e ritorna true se l'utente l'ha guardato
// abbastanza da guadagnare la ricompensa. userId viene passato ad AdMob come
// parametro di verifica lato server: e' cosi' che la callback firmata di
// AdMob (rotta /api/admob/ssv) sa a quale utente accreditare il credito.
// Lancia un errore se non c'e' nessun video disponibile da mostrare.
export async function showRewardedAd(userId: string): Promise<boolean> {
  const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');

  if (!sdkInitialized) {
    await AdMob.initialize();
    sdkInitialized = true;
  }

  const listeners: PluginListenerHandle[] = [];
  let earned = false;
  let closeAd!: () => void;
  const closed = new Promise<void>((resolve) => {
    closeAd = resolve;
  });

  try {
    listeners.push(
      await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        earned = true;
      }),
      await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => closeAd()),
      await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => closeAd())
    );

    await AdMob.prepareRewardVideoAd({ adId: ADMOB_REWARDED_AD_UNIT_ID, ssv: { userId } });

    // showRewardVideoAd si risolve quando la ricompensa e' guadagnata, ma
    // l'utente puo' ancora vedere la schermata finale: aspettiamo la chiusura
    // vera (Dismissed), con un tetto di sicurezza se l'evento non arrivasse.
    const shown = AdMob.showRewardVideoAd().then(
      () => {
        earned = true;
      },
      () => closeAd()
    );
    await Promise.race([closed, shown.then(() => new Promise<void>((r) => setTimeout(r, 45000)))]);
    return earned;
  } finally {
    listeners.forEach((l) => l.remove());
  }
}
