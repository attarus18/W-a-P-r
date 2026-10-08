package appinventor.ai_attarus18.CalcoloCandele;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Widget "Entrate del mese": somma delle vendite (public.sales) da inizio
 * mese corrente a oggi, per l'utente con sessione salvata in WidgetDataStore.
 *
 * Nota sulla valuta: a differenza dell'app (che adatta la valuta alla lingua
 * dell'utente via currency-context.tsx) qui mostriamo sempre EUR per
 * semplicita': replicare quella logica in Java non vale la complessita' per
 * un singolo numero in un widget. Da rivedere se servisse in futuro.
 */
public class RevenueWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_revenue);
        views.setOnClickPendingIntent(R.id.widget_revenue_root, openAppPendingIntent(context));

        if (!WidgetDataStore.hasSession(context)) {
            views.setTextViewText(R.id.widget_revenue_value, "--");
            views.setTextViewText(R.id.widget_revenue_subtitle, context.getString(R.string.widget_signed_out));
            appWidgetManager.updateAppWidget(appWidgetId, views);
            return;
        }

        // La query di rete non puo' girare sul thread principale (quello su
        // cui AppWidgetProvider riceve onUpdate): la eseguiamo in un thread
        // a parte e pubblichiamo il risultato quando arriva.
        new Thread(() -> {
            String userId = WidgetDataStore.getUserId(context);
            String startOfMonth = startOfCurrentMonthIso();
            String path = "sales?select=quantity,sale_price,production_cost&user_id=eq."
                    + userId + "&created_at=gte." + startOfMonth;
            JSONArray rows = SupabaseWidgetClient.get(context, path);

            RemoteViews updated = new RemoteViews(context.getPackageName(), R.layout.widget_revenue);
            updated.setOnClickPendingIntent(R.id.widget_revenue_root, openAppPendingIntent(context));

            if (rows == null) {
                updated.setTextViewText(R.id.widget_revenue_value, "--");
                updated.setTextViewText(R.id.widget_revenue_subtitle, context.getString(R.string.widget_error));
            } else {
                double gross = 0;
                int saleCount = rows.length();
                for (int i = 0; i < rows.length(); i++) {
                    JSONObject row = rows.optJSONObject(i);
                    if (row == null) continue;
                    double quantity = row.optDouble("quantity", 0);
                    double salePrice = row.optDouble("sale_price", 0);
                    gross += quantity * salePrice;
                }
                updated.setTextViewText(R.id.widget_revenue_value, formatCurrency(gross));
                updated.setTextViewText(
                        R.id.widget_revenue_subtitle,
                        saleCount == 1 ? "1 vendita questo mese" : saleCount + " vendite questo mese"
                );
            }

            appWidgetManager.updateAppWidget(appWidgetId, updated);
        }).start();
    }

    private static String startOfCurrentMonthIso() {
        Calendar cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        cal.set(Calendar.DAY_OF_MONTH, 1);
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(cal.getTime());
    }

    private static String formatCurrency(double amount) {
        return String.format(Locale.ITALY, "€ %,.2f", amount);
    }

    private static PendingIntent openAppPendingIntent(Context context) {
        Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(context, 0, intent, flags);
    }
}
