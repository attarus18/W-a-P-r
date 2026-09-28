// Unita' banner reale; l'ID di test ufficiale Google resta come fallback
// solo per gli ambienti dove NEXT_PUBLIC_ADMOB_BANNER_AD_UNIT_ID non e'
// configurata (es. sviluppo locale senza .env.local completo).
export const ADMOB_BANNER_AD_UNIT_ID =
  process.env.NEXT_PUBLIC_ADMOB_BANNER_AD_UNIT_ID ?? 'ca-app-pub-3940256099942544/6300978111';

// Unita' "con ricompensa" (video prima di una richiesta AI). Stesso schema del
// banner: fallback sull'ID di test ufficiale Google finche' l'unita' reale non
// e' configurata. NB: con l'ID di test AdMob NON invia la callback di verifica
// lato server, quindi la ricompensa non viene accreditata: per provare il
// flusso completo serve l'unita' reale (con la callback impostata) su un
// dispositivo di test.
export const ADMOB_REWARDED_AD_UNIT_ID =
  process.env.NEXT_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID ?? 'ca-app-pub-3940256099942544/5224354917';
