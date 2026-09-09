export const FREE_RECIPE_LIMIT = 2;
export const FREE_PRODUCT_LIMIT = 2;

// Limite prodotti/ricette durante i 7 giorni di prova gratuita: uguale per
// tutti i piani indipendentemente da quale si sta provando.
export const TRIAL_PRODUCT_LIMIT = 5;
export const TRIAL_RECIPE_LIMIT = 5;

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
