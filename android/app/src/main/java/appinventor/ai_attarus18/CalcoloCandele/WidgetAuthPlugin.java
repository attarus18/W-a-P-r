package appinventor.ai_attarus18.CalcoloCandele;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte JS -> nativo per tenere i widget della home screen al corrente della
 * sessione Supabase. Chiamato da src/lib/native-widget-sync.ts ogni volta che
 * cambia lo stato di autenticazione (login, refresh del token, logout).
 */
@CapacitorPlugin(name = "WidgetAuth")
public class WidgetAuthPlugin extends Plugin {

    @PluginMethod
    public void saveSession(PluginCall call) {
        String accessToken = call.getString("accessToken");
        String refreshToken = call.getString("refreshToken");
        String userId = call.getString("userId");
        String supabaseUrl = call.getString("supabaseUrl");
        String supabaseAnonKey = call.getString("supabaseAnonKey");
        Long expiresAt = call.getLong("expiresAt");

        if (accessToken == null || refreshToken == null || userId == null
                || supabaseUrl == null || supabaseAnonKey == null) {
            call.reject("Parametri sessione mancanti");
            return;
        }

        WidgetDataStore.saveSession(
                getContext(),
                accessToken,
                refreshToken,
                userId,
                supabaseUrl,
                supabaseAnonKey,
                expiresAt != null ? expiresAt : 0
        );
        WidgetUpdateScheduler.refreshAllWidgetsNow(getContext());
        call.resolve();
    }

    @PluginMethod
    public void clearSession(PluginCall call) {
        WidgetDataStore.clearSession(getContext());
        WidgetUpdateScheduler.refreshAllWidgetsNow(getContext());
        call.resolve();
    }
}
