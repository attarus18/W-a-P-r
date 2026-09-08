import { NextResponse } from 'next/server';
import { requireProUserWithinDailyLimit } from '@/lib/ai/guard';
import { generateRecipeSuggestion } from '@/lib/gemini/client';
import { WAX_TYPES, WAX_FRAGRANCE_PROFILES, type WaxType } from '@/lib/wax-types';

export const runtime = 'nodejs';

// Tetto di sicurezza per utente: generoso per l'uso reale (poche richieste a
// sessione quando si progetta una nuova candela), basso abbastanza da non
// far esplodere il costo se qualcuno automatizza le chiamate. Condiviso con
// /api/ai/suggest-fragrance-concept: stesso budget giornaliero complessivo
// per tutte le funzionalita' del Suggeritore AI.
const DAILY_LIMIT = 15;

export async function POST(req: Request) {
  const guard = await requireProUserWithinDailyLimit(req, { table: 'ai_recipe_suggestions', dailyLimit: DAILY_LIMIT });
  if (guard.error) return guard.error;
  const { userId, supabase } = guard;

  const body = await req.json().catch(() => ({}));
  const waxType = (WAX_TYPES as readonly string[]).includes(body?.waxType) ? (body.waxType as WaxType) : null;
  const containerWeightG = Number(body?.containerWeightG);
  const scentProfile = typeof body?.scentProfile === 'string' ? body.scentProfile.slice(0, 300) : '';
  const avoidColor = Boolean(body?.avoidColor);
  const language = typeof body?.language === 'string' ? body.language.slice(0, 5) : 'it';

  if (!waxType || !Number.isFinite(containerWeightG) || containerWeightG <= 0) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 400 });
  }

  try {
    const suggestion = await generateRecipeSuggestion({
      waxType,
      waxProfile: WAX_FRAGRANCE_PROFILES[waxType],
      containerWeightG,
      scentProfile,
      avoidColor,
      language,
    });

    // Registrato dopo una generazione riuscita: se Gemini fallisce non
    // consumiamo comunque la quota giornaliera dell'utente.
    await supabase.from('ai_recipe_suggestions').insert({ user_id: userId });

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Errore generazione suggerimento AI:', error);
    return NextResponse.json({ error: 'Impossibile generare il suggerimento' }, { status: 500 });
  }
}
