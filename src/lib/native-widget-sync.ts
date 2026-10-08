import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Session } from '@supabase/supabase-js';

// Plugin Capacitor custom (scritto in android/, non da npm): vedi
// WidgetAuthPlugin.java. Tiene sincronizzati i widget della home screen
// Android con la sessione Supabase corrente, salvandone i token in
// SharedPreferences native (i widget non hanno accesso al localStorage
// della WebView dove vive la sessione del client Supabase JS).
interface WidgetAuthPlugin {
  saveSession(options: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    expiresAt: number;
  }): Promise<void>;
  clearSession(): Promise<void>;
}

const WidgetAuth = registerPlugin<WidgetAuthPlugin>('WidgetAuth');

// No-op fuori dalla piattaforma nativa: i widget Android non esistono su
// web/altre piattaforme, e il plugin stesso non e' registrato li'.
export async function syncWidgetSession(session: Session | null): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (!session) {
      await WidgetAuth.clearSession();
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;

    await WidgetAuth.saveSession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      userId: session.user.id,
      supabaseUrl,
      supabaseAnonKey,
      expiresAt: session.expires_at ?? 0,
    });
  } catch (error) {
    // I widget sono un extra: un problema qui non deve mai rompere login/logout.
    console.error('Sincronizzazione sessione widget non riuscita', error);
  }
}
