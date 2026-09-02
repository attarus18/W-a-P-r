// Unita' banner reale; l'ID di test ufficiale Google resta come fallback
// solo per gli ambienti dove NEXT_PUBLIC_ADMOB_BANNER_AD_UNIT_ID non e'
// configurata (es. sviluppo locale senza .env.local completo).
export const ADMOB_BANNER_AD_UNIT_ID =
  process.env.NEXT_PUBLIC_ADMOB_BANNER_AD_UNIT_ID ?? 'ca-app-pub-3940256099942544/6300978111';
