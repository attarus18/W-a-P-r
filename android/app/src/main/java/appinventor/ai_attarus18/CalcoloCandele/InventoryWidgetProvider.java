package appinventor.ai_attarus18.CalcoloCandele;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget "Magazzino": numero totale di prodotti e quanti sono sotto la
 * soglia di riordino (public.products: quantity <= reorder_threshold).
 */
public class InventoryWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_inventory);
        views.setOnClickPendingIntent(R.id.widget_inventory_root, openAppPendingIntent(context));

        if (!WidgetDataStore.hasSession(context)) {
            views.setTextViewText(R.id.widget_inventory_value, "--");
            views.setTextViewText(R.id.widget_inventory_subtitle, context.getString(R.string.widget_signed_out));
            appWidgetManager.updateAppWidget(appWidgetId, views);
            return;
        }

        new Thread(() -> {
            String userId = WidgetDataStore.getUserId(context);
            String path = "products?select=quantity,reorder_threshold&user_id=eq." + userId;
            JSONArray rows = SupabaseWidgetClient.get(context, path);

            RemoteViews updated = new RemoteViews(context.getPackageName(), R.layout.widget_inventory);
            updated.setOnClickPendingIntent(R.id.widget_inventory_root, openAppPendingIntent(context));

            if (rows == null) {
                updated.setTextViewText(R.id.widget_inventory_value, "--");
                updated.setTextViewText(R.id.widget_inventory_subtitle, context.getString(R.string.widget_error));
            } else {
                int total = rows.length();
                int belowThreshold = 0;
                for (int i = 0; i < rows.length(); i++) {
                    JSONObject row = rows.optJSONObject(i);
                    if (row == null) continue;
                    double quantity = row.optDouble("quantity", 0);
                    double threshold = row.optDouble("reorder_threshold", 0);
                    if (quantity <= threshold) belowThreshold++;
                }
                updated.setTextViewText(R.id.widget_inventory_value, total + (total == 1 ? " prodotto" : " prodotti"));
                updated.setTextViewText(
                        R.id.widget_inventory_subtitle,
                        belowThreshold == 0
                                ? "Nessuno sotto scorta"
                                : belowThreshold == 1
                                        ? "1 prodotto sotto scorta"
                                        : belowThreshold + " prodotti sotto scorta"
                );
            }

            appWidgetManager.updateAppWidget(appWidgetId, updated);
        }).start();
    }

    private static PendingIntent openAppPendingIntent(Context context) {
        Intent intent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(context, 0, intent, flags);
    }
}
