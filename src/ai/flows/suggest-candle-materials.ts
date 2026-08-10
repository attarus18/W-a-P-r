'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting optimal candle-making materials based on user inputs.
 *
 * It exports:
 * - `suggestCandleMaterials`: The main function to trigger the material suggestion flow.
 * - `SuggestCandleMaterialsInput`: The TypeScript interface for the input schema.
 * - `SuggestCandleMaterialsOutput`: The TypeScript interface for the output schema.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCandleMaterialsInputSchema = z.object({
  candleType: z.string().describe('Il tipo di candela da realizzare (es. a colonna, in contenitore, votiva).'),
  fragrance: z.string().describe('La fragranza desiderata per la candela.'),
  containerChoice: z.string().describe('Il tipo di contenitore utilizzato (es. barattolo di vetro, latta, stampo).'),
});
export type SuggestCandleMaterialsInput = z.infer<typeof SuggestCandleMaterialsInputSchema>;

const SuggestCandleMaterialsOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      wax: z.string().describe('Tipo di cera suggerito.'),
      wick: z.string().describe('Tipo di stoppino suggerito.'),
      color: z.string().describe('Colore suggerito.'),
      costEfficiencyRank: z.number().describe('Classifica del suggerimento in base all\'efficienza dei costi (1 è il più efficiente).'),
      reasoning: z.string().describe('Spiegazione del perché la cera, lo stoppino e il colore sono suggeriti'),
    })
  ).describe('Un elenco di combinazioni di materiali suggerite, classificate per efficienza dei costi.'),
});
export type SuggestCandleMaterialsOutput = z.infer<typeof SuggestCandleMaterialsOutputSchema>;

export async function suggestCandleMaterials(input: SuggestCandleMaterialsInput): Promise<SuggestCandleMaterialsOutput> {
  return suggestCandleMaterialsFlow(input);
}

const suggestCandleMaterialsPrompt = ai.definePrompt({
  name: 'suggestCandleMaterialsPrompt',
  input: {schema: SuggestCandleMaterialsInputSchema},
  output: {schema: SuggestCandleMaterialsOutputSchema},
  prompt: `Sei un assistente esperto nella produzione di candele. In base al tipo di candela, alla fragranza e alla scelta del contenitore forniti dall'utente, suggerirai tre combinazioni ottimali di cera, stoppino e colore, classificate per efficienza dei costi.

  Tipo di Candela: {{{candleType}}}
  Fragranza: {{{fragrance}}}
  Scelta del Contenitore: {{{containerChoice}}}

  Fornisci i tuoi suggerimenti in formato JSON.
  Ogni suggerimento dovrebbe includere un campo 'wax', 'wick', e 'color' con una classifica di efficienza dei costi (costEfficiencyRank) e una breve spiegazione del perché questa combinazione è ottimale. La classifica di efficienza dei costi dovrebbe essere un numero compreso tra 1 e 3, dove 1 è il più efficiente.
  Assicurati che la risposta sia un array JSON valido di oggetti.
  `,
});

const suggestCandleMaterialsFlow = ai.defineFlow(
  {
    name: 'suggestCandleMaterialsFlow',
    inputSchema: SuggestCandleMaterialsInputSchema,
    outputSchema: SuggestCandleMaterialsOutputSchema,
  },
  async input => {
    const {output} = await suggestCandleMaterialsPrompt(input);
    return output!;
  }
);
