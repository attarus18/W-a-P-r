package appinventor.ai_attarus18.CalcoloCandele;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Sessione Supabase salvata per uso dai widget della home screen.
 *
 * I widget girano come AppWidgetProvider nello stesso processo dell'app,
 * ma non hanno accesso al localStorage della WebView (dove vive la sessione
 * del client Supabase JS). Il plugin WidgetAuthPlugin copia qui access/refresh
 * token ogni volta che la sessione cambia lato JS (login, refresh, logout);
 * i provider dei widget li leggono per interrogare le REST API Supabase
 * autonomamente, rinnovando l'access token quando serve (vedi SupabaseWidgetClient).
 */
final class WidgetDataStore {
    private static final String PREFS_NAME = "waxpro_widget_session";
    private static final String KEY_ACCESS_TOKEN = "access_token";
    private static final String KEY_REFRESH_TOKEN = "refresh_token";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_SUPABASE_URL = "supabase_url";
    private static final String KEY_SUPABASE_ANON_KEY = "supabase_anon_key";
    private static final String KEY_EXPIRES_AT = "expires_at";

    private WidgetDataStore() {
    }

    static void saveSession(
            Context ctx,
            String accessToken,
            String refreshToken,
            String userId,
            String supabaseUrl,
            String supabaseAnonKey,
            long expiresAtEpochSeconds
    ) {
        prefs(ctx).edit()
                .putString(KEY_ACCESS_TOKEN, accessToken)
                .putString(KEY_REFRESH_TOKEN, refreshToken)
                .putString(KEY_USER_ID, userId)
                .putString(KEY_SUPABASE_URL, supabaseUrl)
                .putString(KEY_SUPABASE_ANON_KEY, supabaseAnonKey)
                .putLong(KEY_EXPIRES_AT, expiresAtEpochSeconds)
                .apply();
    }

    /** Aggiorna solo access token + scadenza dopo un refresh, lasciando il resto invariato. */
    static void updateAccessToken(Context ctx, String accessToken, String refreshToken, long expiresAtEpochSeconds) {
        prefs(ctx).edit()
                .putString(KEY_ACCESS_TOKEN, accessToken)
                .putString(KEY_REFRESH_TOKEN, refreshToken)
                .putLong(KEY_EXPIRES_AT, expiresAtEpochSeconds)
                .apply();
    }

    static void clearSession(Context ctx) {
        prefs(ctx).edit().clear().apply();
    }

    static boolean hasSession(Context ctx) {
        return prefs(ctx).contains(KEY_REFRESH_TOKEN);
    }

    static String getAccessToken(Context ctx) {
        return prefs(ctx).getString(KEY_ACCESS_TOKEN, null);
    }

    static String getRefreshToken(Context ctx) {
        return prefs(ctx).getString(KEY_REFRESH_TOKEN, null);
    }

    static String getUserId(Context ctx) {
        return prefs(ctx).getString(KEY_USER_ID, null);
    }

    static String getSupabaseUrl(Context ctx) {
        return prefs(ctx).getString(KEY_SUPABASE_URL, null);
    }

    static String getSupabaseAnonKey(Context ctx) {
        return prefs(ctx).getString(KEY_SUPABASE_ANON_KEY, null);
    }

    static long getExpiresAt(Context ctx) {
        return prefs(ctx).getLong(KEY_EXPIRES_AT, 0);
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
