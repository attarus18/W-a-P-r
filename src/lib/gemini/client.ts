import { GoogleGenAI } from '@google/genai';

// Server-only: legge GEMINI_API_KEY (mai NEXT_PUBLIC_) e viene importato solo
// dalla rotta API /api/ai/suggest-fragrance-concept. Non importare mai questo
// file in codice che gira nel browser.
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

export interface FragranceConceptInput {
  concept: string;
  language: string;
}

export interface FragranceComponent {
  name: string;
  percentage: number;
}

export interface FragranceOption {
  title: string;
  description: string;
  topNote: string;
  heartNote: string;
  baseNote: string;
  fragrances: FragranceComponent[];
}

export interface FragranceConceptResult {
  blocked: boolean;
  blockReason: string;
  options: FragranceOption[];
}

const FRAGRANCE_CONCEPT_SCHEMA = {
  type: 'object',
  properties: {
    blocked: { type: 'boolean' },
    blockReason: { type: 'string' },
    options: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          topNote: { type: 'string' },
          heartNote: { type: 'string' },
          baseNote: { type: 'string' },
          fragrances: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                percentage: { type: 'number' },
              },
              required: ['name', 'percentage'],
            },
          },
        },
        required: ['title', 'description', 'topNote', 'heartNote', 'baseNote', 'fragrances'],
      },
    },
  },
  required: ['blocked', 'blockReason', 'options'],
} as const;

/**
 * Normalizza le percentuali di un blend in modo che sommino (circa) a 100,
 * scartando componenti a percentuale non positiva. Non ci fidiamo del
 * modello per far tornare i conti da solo.
 */
function normalizeFragrancePercentages(fragrances: FragranceComponent[]): FragranceComponent[] {
  const positive = fragrances.filter((f) => f.name && f.percentage > 0);
  const total = positive.reduce((sum, f) => sum + f.percentage, 0);
  if (total <= 0) return [];
  return positive.map((f) => ({
    name: f.name,
    percentage: Math.round((f.percentage / total) * 1000) / 10,
  }));
}

/**
 * Trasforma un'idea/atmosfera descritta dall'utente in 3 proposte di
 * fragranza per candele. La stessa chiamata funge anche da moderazione: se
 * la richiesta e' offensiva o non pertinente alla creazione di una candela,
 * il modello risponde con blocked=true e nessuna opzione, invece di
 * richiedere una seconda chiamata separata solo per il filtro.
 */
export async function generateFragranceConcept(input: FragranceConceptInput): Promise<FragranceConceptResult> {
  const ai = getClient();

  const prompt = `Sei un "naso" esperto di profumeria per candele artigianali: aiuti i chandler a trasformare un'idea o un'atmosfera in una ricetta di fragranza.

Richiesta del cliente: "${input.concept}"

Prima valuta la richiesta:
- Se contiene insulti, volgarita', contenuti sessuali, odio, violenza, o comunque non e' un'idea/atmosfera/luogo/emozione da cui creare una candela profumata, imposta blocked=true e in blockReason spiega in una frase breve e cortese il motivo (in lingua "${input.language}"), lasciando options vuoto.
- Altrimenti imposta blocked=false, blockReason="" e genera ESATTAMENTE 3 opzioni di ricette di fragranza diverse tra loro, ispirate alla richiesta.

Per ogni opzione:
- title: titolo breve ed evocativo per la candela (max 6 parole).
- description: 2-3 frasi che raccontano l'atmosfera della fragranza e perche' richiama la richiesta del cliente.
- topNote, heartNote, baseNote: la sensazione olfattiva percepita rispettivamente in apertura, cuore e fondo, poche parole ciascuna.
- fragrances: 2-4 componenti del blend con relativa percentuale (percentage), che sommate danno circa 100. Usa SOLO note olfattive comuni e facilmente reperibili presso i principali fornitori di fragranze per candele (es. vaniglia, cocco, agrumi come bergamotto/arancia/limone, sale marino, legno di sandalo, cedro, lavanda, rosa, gelsomino, cannella, caramello, muschio bianco, te' verde, fico, pino, eucalipto). Evita fragranze rare, esotiche o difficili da reperire.

Rispondi solo in lingua "${input.language}".`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: FRAGRANCE_CONCEPT_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text ?? '{}');
  const blocked = Boolean(parsed.blocked);

  if (blocked) {
    return {
      blocked: true,
      blockReason: String(parsed.blockReason ?? '').slice(0, 300) || 'La richiesta non è pertinente alla creazione di una candela profumata.',
      options: [],
    };
  }

  const rawOptions = Array.isArray(parsed.options) ? parsed.options.slice(0, 3) : [];
  const options: FragranceOption[] = rawOptions
    .map((opt: any) => {
      const rawFragrances = Array.isArray(opt?.fragrances) ? opt.fragrances.slice(0, 5) : [];
      const fragrances = normalizeFragrancePercentages(
        rawFragrances.map((f: any) => ({
          name: String(f?.name ?? '').trim().slice(0, 60),
          percentage: Number(f?.percentage) || 0,
        }))
      );
      return {
        title: String(opt?.title ?? '').slice(0, 80),
        description: String(opt?.description ?? '').slice(0, 500),
        topNote: String(opt?.topNote ?? '').slice(0, 150),
        heartNote: String(opt?.heartNote ?? '').slice(0, 150),
        baseNote: String(opt?.baseNote ?? '').slice(0, 150),
        fragrances,
      };
    })
    .filter((opt: FragranceOption) => opt.title && opt.fragrances.length > 0);

  if (options.length === 0) {
    throw new Error('Nessuna opzione valida generata');
  }

  return { blocked: false, blockReason: '', options };
}
