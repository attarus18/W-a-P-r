import { NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Punto di rientro del login con Google (e di qualunque altro provider OAuth
 * aggiunto in futuro): riceve il "code" dopo il redirect da Google/Supabase,
 * lo scambia per una sessione (scrivendo i cookie di autenticazione) e
 * riporta l'utente nell'app. Il trigger handle_new_user su auth.users crea
 * automaticamente la riga profiles anche per un primo accesso via Google,
 * non serve gestirlo qui.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/dashboard';
  if (!next.startsWith('/')) {
    next = '/dashboard';
  }

  if (code) {
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
