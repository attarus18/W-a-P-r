import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPPORT_INBOX = 'waxpro.app@gmail.com';
const MAX_MESSAGE_LENGTH = 5000;

/**
 * Inoltra una richiesta di assistenza dall'utente autenticato alla casella
 * waxpro.app@gmail.com via Resend (API HTTP, nessuna dipendenza Node-only,
 * come per la verifica Play Billing). L'email del mittente e' presa dalla
 * sessione lato server, mai da quanto inviato dal client, cosi' non puo'
 * essere falsificata; viene usata anche come reply-to cosi' si puo'
 * rispondere direttamente all'utente.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 });
  }

  const authClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData?.user?.email) {
    return NextResponse.json({ error: 'Sessione non valida' }, { status: 401 });
  }
  const userEmail = userData.user.email;

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Il messaggio non può essere vuoto' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Il messaggio è troppo lungo' }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('support/send: RESEND_API_KEY non configurata');
    return NextResponse.json({ error: 'Servizio di invio email non configurato' }, { status: 500 });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WaxPro Assistenza <onboarding@resend.dev>',
      to: [SUPPORT_INBOX],
      reply_to: userEmail,
      subject: `Richiesta assistenza da ${userEmail}`,
      text: `Richiesta di assistenza da: ${userEmail}\n\n${message}`,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('support/send: errore invio Resend', res.status, errBody);
    return NextResponse.json({ error: 'Impossibile inviare la richiesta' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
