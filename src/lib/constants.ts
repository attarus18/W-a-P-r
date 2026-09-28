export const FREE_RECIPE_LIMIT = 2;
export const FREE_PRODUCT_LIMIT = 2;

// Video con ricompensa (AdMob rewarded): chi non e' abbonato ne guarda uno per
// ogni richiesta al Suggeritore AI, fino a questo tetto nelle ultime 24 ore.
// Tenere allineato con il valore passato a grant_reward_credit() in
// src/app/api/admob/ssv/route.ts (stessa costante).
export const REWARD_DAILY_LIMIT = 3;

export type PaidPlan = 'hobby' | 'pro' | 'annual';

// Limite prodotti in magazzino per piano a pagamento. Pro e Annuale sono
// senza limite pratico (Infinity): la UI mostra "illimitato" quando lo
// incontra invece di stampare il numero.
export const PRODUCT_LIMITS: Record<PaidPlan, number> = {
  hobby: 20,
  pro: Infinity,
  annual: Infinity,
};

// Limite ricette salvabili per piano: a differenza dei prodotti, qui anche
// Pro e Annuale hanno un tetto (100 ricette, non cumulabile nel tempo).
export const RECIPE_LIMITS: Record<PaidPlan, number> = {
  hobby: 10,
  pro: 100,
  annual: 100,
};

// Richieste giornaliere al Suggeritore AI per piano. Per Pro/Annuale il
// piano lo pubblicizza come "illimitato" in UI: qui usiamo comunque un
// tetto alto come rete di sicurezza anti-abuso, che nessun utente reale
// dovrebbe mai raggiungere.
export const AI_DAILY_LIMITS: Record<PaidPlan, number> = {
  hobby: 3,
  pro: 200,
  annual: 200,
};
