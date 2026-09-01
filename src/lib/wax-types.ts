export const WAX_TYPES = ['soy', 'olive', 'rapeseed', 'beeswax', 'coconut', 'paraffin'] as const;
export type WaxType = typeof WAX_TYPES[number];

// Carico di fragranza tipico per tipo di cera (% sul peso totale).
// Fonte: pratiche comuni della candelistica artigianale - la cera d'api
// trattiene molta meno fragranza, la paraffina ne accetta di più.
export const WAX_FRAGRANCE_PROFILES: Record<WaxType, { min: number; max: number; default: number }> = {
  soy: { min: 6, max: 10, default: 8 },
  olive: { min: 4, max: 7, default: 6 },
  rapeseed: { min: 6, max: 10, default: 8 },
  beeswax: { min: 2, max: 5, default: 4 },
  coconut: { min: 6, max: 10, default: 8 },
  paraffin: { min: 4, max: 12, default: 8 },
};

export const DEFAULT_WAX_TYPE: WaxType = 'soy';
