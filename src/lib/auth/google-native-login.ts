import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import type { SupabaseClient } from '@supabase/supabase-js';

// Schema di rientro registrato nell'AndroidManifest (intent-filter su
// MainActivity) per il deep link di ritorno dal browser di sistema.
const NATIVE_REDIRECT_URL = 'waxpro://auth/callback';

/**
 * Avvia il login/registrazione Google. Su web usa il normale redirect nella
 * stessa pagina verso /auth/callback. Su Android (Capacitor) apre il flusso
 * OAuth nel browser di sistema (Chrome Custom Tabs) invece che nella WebView
 * incorporata dell'app: Google blocca/ostacola il login OAuth dentro le
 * WebView incorporate ("disallowed_useragent"), causando lentezza, avvisi
 * "browser non sicuro" o blocchi. Il rientro avviene via deep link
 * (waxpro://auth/callback), da cui si estrae il "code" e si completa lo
 * scambio per la sessione con lo stesso client Supabase usato per avviarlo
 * (necessario perche' il flow PKCE tiene il code verifier nello storage di
 * quel client).
 */
export async function signInWithGoogle(
  supabase: SupabaseClient,
  onError: (message?: string) => void,
  // Chiamato quando l'utente chiude il browser di sistema senza completare
  // il login (es. torna indietro): resetta lo stato di caricamento senza
  // mostrare un errore. Ignorato su web.
  onCancelled?: () => void
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) onError(error.message);
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: NATIVE_REDIRECT_URL, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    onError(error?.message);
    return;
  }

  let completed = false;

  const urlListener = await App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(NATIVE_REDIRECT_URL)) return;
    completed = true;
    await urlListener.remove();
    await finishedListener.remove();
    Browser.close().catch(() => {});

    try {
      const code = new URL(url).searchParams.get('code');
      if (!code) throw new Error('Codice di autorizzazione mancante');
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      // La sessione risultante viene raccolta da onAuthStateChange in
      // AuthProvider: gli useEffect delle pagine login/signup che
      // reindirizzano su /dashboard quando "user" diventa valorizzato
      // scattano da soli, non serve navigare qui.
    } catch (e: any) {
      onError(e?.message);
    }
  });

  // L'utente puo' chiudere le Custom Tabs (freccia indietro) senza
  // completare il login: senza questo listener il bottone resterebbe
  // bloccato in caricamento all'infinito.
  const finishedListener = await Browser.addListener('browserFinished', async () => {
    if (completed) return;
    await urlListener.remove();
    await finishedListener.remove();
    onCancelled?.();
  });

  await Browser.open({ url: data.url, presentationStyle: 'popover' });
}
