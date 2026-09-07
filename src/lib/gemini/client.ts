import { GoogleGenAI } from '@google/genai';

// Server-only: legge GEMINI_API_KEY (mai NEXT_PUBLIC_) e viene importato solo
// dalla rotta API /api/ai/suggest-recipe. Non importare mai questo file in
// codice che gira nel browser.
let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY non configurata');
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export interface RecipeSuggestionInput {
  waxType: string;
  waxProfile: { min: number; max: number; default: number };
  containerWeightG: number;
  scentProfile: string;
  avoidColor: boolean;
  language: string;
}

export interface RecipeSuggestion {
  fragrancePct: number;
  colorPct: number;
  wickSuggestion: string;
  rationale: string;
  safetyNote: string;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    fragrancePct: { type: 'number' },
    colorPct: { type: 'number' },
    wickSuggestion: { type: 'string' },
    rationale: { type: 'string' },
    safetyNote: { type: 'string' },
  },
  required: ['fragrancePct', 'colorPct', 'wickSuggestion', 'rationale', 'safetyNote'],
} as const;

/**
 * Genera un suggerimento di ricetta via Gemini. Le percentuali restituite
 * sono sempre "clampate" ai range noti di src/lib/wax-types.ts prima di
 * tornare al chiamante: non ci fidiamo ciecamente di un valore generato dal
 * modello per un dato che ha implicazioni di sicurezza (carico di fragranza).
 */
export async function generateRecipeSuggestion(input: RecipeSuggestionInput): Promise<RecipeSuggestion> {
  const ai = getClient();

  const prompt = `Sei un esperto di candele artigianali. Suggerisci le percentuali di fragranza e colorante per questa ricetta.

Cera: ${input.waxType} (carico di fragranza tipico ${input.waxProfile.min}-${input.waxProfile.max}%, valore consigliato di partenza ${input.waxProfile.default}%)
Peso contenitore: ${input.containerWeightG} g
Profilo olfattivo desiderato: ${input.scentProfile || 'nessuna preferenza specifica'}
${input.avoidColor ? 'Il cliente non vuole colorante: colorPct deve essere 0.' : ''}

Regole:
- fragrancePct deve stare nell'intervallo indicato per questa cera (${input.waxProfile.min}-${input.waxProfile.max}), non oltre.
- colorPct tra 0 e 3, tipicamente sotto l'1% per candele in cera naturale.
- wickSuggestion: una riga breve con taglia/tipo di stoppino indicativo in base al diametro tipico di un contenitore da ${input.containerWeightG}g.
- rationale: 1-2 frasi che spiegano la scelta.
- safetyNote: 1 frase che ricorda di verificare sempre carico di fragranza e sicurezza con la Scheda Dati di Sicurezza del fornitore.
Rispondi solo in lingua "${input.language}".`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text ?? '{}');

  const fragrancePct = Math.min(
    Math.max(Number(parsed.fragrancePct) || input.waxProfile.default, input.waxProfile.min),
    input.waxProfile.max
  );
  const colorPct = input.avoidColor ? 0 : Math.min(Math.max(Number(parsed.colorPct) || 0, 0), 3);

  return {
    fragrancePct: Math.round(fragrancePct * 10) / 10,
    colorPct: Math.round(colorPct * 10) / 10,
    wickSuggestion: String(parsed.wickSuggestion ?? '').slice(0, 200),
    rationale: String(parsed.rationale ?? '').slice(0, 500),
    safetyNote: String(parsed.safetyNote ?? '').slice(0, 300),
  };
}
