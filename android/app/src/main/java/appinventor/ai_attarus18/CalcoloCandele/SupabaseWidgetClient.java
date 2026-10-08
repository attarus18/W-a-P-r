package appinventor.ai_attarus18.CalcoloCandele;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Chiamate dirette alle REST API di Supabase per i dati dei widget, con
 * rinnovo automatico dell'access token quando e' scaduto. Va sempre invocata
 * da un thread in background: i widget la chiamano da WidgetUpdateScheduler,
 * mai dal thread principale (AppWidgetProvider.onUpdate gira sul main thread).
 */
final class SupabaseWidgetClient {
    private static final String TAG = "WaxProWidget";
    private static final long REFRESH_MARGIN_SECONDS = 60;

    private SupabaseWidgetClient() {
    }

    /**
     * Esegue una GET autenticata su PostgREST (path relativo, es.
     * "products?select=id,name&user_id=eq.xxx") e ritorna l'array dei
     * risultati, o null se manca la sessione o la richiesta fallisce.
     */
    static JSONArray get(Context ctx, String pathAndQuery) {
        String accessToken = ensureAccessToken(ctx);
        String supabaseUrl = WidgetDataStore.getSupabaseUrl(ctx);
        String anonKey = WidgetDataStore.getSupabaseAnonKey(ctx);
        if (accessToken == null || supabaseUrl == null || anonKey == null) return null;

        HttpURLConnection conn = null;
        try {
            URL url = new URL(supabaseUrl + "/rest/v1/" + pathAndQuery);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setRequestProperty("apikey", anonKey);
            conn.setRequestProperty("Authorization", "Bearer " + accessToken);

            int status = conn.getResponseCode();
            if (status < 200 || status >= 300) {
                Log.w(TAG, "Richiesta widget non riuscita (" + status + "): " + pathAndQuery);
                return null;
            }
            String body = readStream(conn.getInputStream());
            return new JSONArray(body);
        } catch (Exception e) {
            Log.w(TAG, "Errore richiesta widget: " + pathAndQuery, e);
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** Ritorna un access token valido, rinnovandolo se mancante/scaduto. Null se non c'e' sessione o il refresh fallisce. */
    private static String ensureAccessToken(Context ctx) {
        if (!WidgetDataStore.hasSession(ctx)) return null;

        long nowSeconds = System.currentTimeMillis() / 1000;
        long expiresAt = WidgetDataStore.getExpiresAt(ctx);
        String accessToken = WidgetDataStore.getAccessToken(ctx);
        if (accessToken != null && expiresAt > nowSeconds + REFRESH_MARGIN_SECONDS) {
            return accessToken;
        }
        return refreshAccessToken(ctx);
    }

    private static String refreshAccessToken(Context ctx) {
        String refreshToken = WidgetDataStore.getRefreshToken(ctx);
        String supabaseUrl = WidgetDataStore.getSupabaseUrl(ctx);
        String anonKey = WidgetDataStore.getSupabaseAnonKey(ctx);
        if (refreshToken == null || supabaseUrl == null || anonKey == null) return null;

        HttpURLConnection conn = null;
        try {
            URL url = new URL(supabaseUrl + "/auth/v1/token?grant_type=refresh_token");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setRequestProperty("apikey", anonKey);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            JSONObject requestBody = new JSONObject();
            requestBody.put("refresh_token", refreshToken);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(requestBody.toString().getBytes(StandardCharsets.UTF_8));
            }

            int status = conn.getResponseCode();
            InputStream stream = (status >= 200 && status < 300) ? conn.getInputStream() : conn.getErrorStream();
            String responseBody = readStream(stream);

            if (status < 200 || status >= 300) {
                Log.w(TAG, "Rinnovo token non riuscito (" + status + "): " + responseBody);
                // Refresh token non piu' valido (es. logout avvenuto da un
                // altro punto, o revocato lato Supabase): ripuliamo la
                // sessione salvata per non ritentare a vuoto ad ogni
                // aggiornamento del widget.
                if (status == 400 || status == 401) {
                    WidgetDataStore.clearSession(ctx);
                }
                return null;
            }

            JSONObject json = new JSONObject(responseBody);
            String newAccessToken = json.getString("access_token");
            String newRefreshToken = json.optString("refresh_token", refreshToken);
            long expiresIn = json.optLong("expires_in", 3600);
            long expiresAt = System.currentTimeMillis() / 1000 + expiresIn;
            WidgetDataStore.updateAccessToken(ctx, newAccessToken, newRefreshToken, expiresAt);
            return newAccessToken;
        } catch (Exception e) {
            Log.w(TAG, "Errore rinnovo token widget", e);
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String readStream(InputStream in) throws Exception {
        if (in == null) return "";
        BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) sb.append(line);
        reader.close();
        return sb.toString();
    }
}
