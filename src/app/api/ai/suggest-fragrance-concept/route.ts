import { NextResponse } from 'next/server';
import { requireProUserWithinDailyLimit } from '@/lib/ai/guard';
import { generateFragranceConcept } from '@/lib/gemini/client';
import { AI_DAILY_LIMITS, type PaidPlan } from '@/lib/constants';

export const runtime = 'nodejs';

// Limite giornaliero per piano: Hobby e' limitato a 3/giorno (come da
// listino), Pro/Annuale sono pubblicizzati come "illimitato" ma usano
// comunque un tetto alto (AI_DAILY_LIMITS) come rete di sicurezza
// anti-abuso, mai raggiungibile da un utente reale.
const getDailyLimit = (plan: string | null) =>
  plan && plan in AI_DAILY_LIMITS ? AI_DAILY_LIMITS[plan as PaidPlan] : AI_DAILY_LIMITS.hobby;

export async function POST(req: Request) {
  const guard = await requireProUserWithinDailyLimit(req, { table: 'ai_recipe_suggestions', dailyLimit: getDailyLimit });
  if (guard.error) return guard.error;
  const { userId, supabase } = guard;

  const body = await req.json().catch(() => ({}));
  const concept = typeof body?.concept === 'string' ? body.concept.trim().slice(0, 300) : '';
  const language = typeof body?.language === 'string' ? body.language.slice(0, 5) : 'it';

  if (!concept) {
    return NextResponse.json({ error: "Descrivi l'idea per la tua candela" }, { status: 400 });
  }

  try {
    const result = await generateFragranceConcept({ concept, language });

    // Registriamo la chiamata anche quando il contenuto viene bloccato: la
    // richiesta a Gemini ha comunque un costo, e non vogliamo che qualcuno
    // aggiri il limite giornaliero mandando ripetutamente testo inadeguato.
    await supabase.from('ai_recipe_suggestions').insert({ user_id: userId });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Errore generazione concept fragranza:', error);
    return NextResponse.json({ error: 'Impossibile generare le proposte' }, { status: 500 });
  }
}
