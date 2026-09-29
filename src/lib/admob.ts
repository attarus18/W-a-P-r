// Unita' banner reale; l'ID di test ufficiale Google resta come fallback
// solo per gli ambienti dove NEXT_PUBLIC_ADMOB_BANNER_AD_UNIT_ID non e'
// configurata (es. sviluppo locale senza .env.local completo).
export const ADMOB_BANNER_AD_UNIT_ID =
  process.env.NEXT_PUBLIC_ADMOB_BANNER_AD_UNIT_ID ?? 'ca-app-pub-3940256099942544/6300978111';

// Unita' "con ricompensa" (video prima di una richiesta AI): "Video Suggeritore
// AI" nell'app WaxPro su AdMob. Nelle build di produzione usa l'unita' reale
// (e' un identificatore pubblico, gia' incorporato nell'app); in sviluppo usa
// l'ID di test ufficiale Google per non generare impression/click reali sulle
// tue pubblicita'. NEXT_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID, se impostata, ha la
// precedenza in entrambi i casi.
// NB: con l'ID di test AdMob NON invia la callback di verifica lato server,
// quindi la ricompensa non viene accreditata: per provare il flusso completo
// serve la build di produzione su un dispositivo impostato come "di test" in
// AdMob.
const REAL_REWARDED_AD_UNIT_ID = 'ca-app-pub-4870944787959973/1000865632';
const TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';
// DIAGNOSTICA TEMPORANEA (2026-09-29): forziamo sempre l'ID di test per
// isolare se il "no fill" persistente e' mancanza di domanda reale o un
// problema di codice/mediazione. Da rimuovere non appena verificato: vedi
// commit successivo che ripristina la riga originale.
export const ADMOB_REWARDED_AD_UNIT_ID = TEST_REWARDED_AD_UNIT_ID;
// export const ADMOB_REWARDED_AD_UNIT_ID =
//   process.env.NEXT_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID ??
//   (process.env.NODE_ENV === 'production' ? REAL_REWARDED_AD_UNIT_ID : TEST_REWARDED_AD_UNIT_ID);
