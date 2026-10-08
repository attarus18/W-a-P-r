package appinventor.ai_attarus18.CalcoloCandele;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget "Ricette salvate": totale ricette nell'Archivio (public.recipes,
 * il Calcolatore Ricette) e i nomi delle 3 piu' recenti.
 */
public class RecipesWidgetProvider extends AppWidgetProvider {

    private static final int[] ITEM_VIEW_IDS = {
            R.id.widget_recipes_item_1,
            R.id.widget_recipes_item_2,
            R.id.widget_recipes_item_3,
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_recipes);
        views.setOnClickPendingIntent(R.id.widget_recipes_root, openAppPendingIntent(context));

        if (!WidgetDataStore.hasSession(context)) {
            views.setTextViewText(R.id.widget_recipes_value, "--");
            views.setTextViewText(R.id.widget_recipes_subtitle, context.getString(R.string.widget_signed_out));
            appWidgetManager.updateAppWidget(appWidgetId, views);
            return;
        }

        new Thread(() -> {
            String userId = WidgetDataStore.getUserId(context);
            String path = "recipes?select=name,created_at&user_id=eq." + userId + "&order=created_at.desc";
            JSONArray rows = SupabaseWidgetClient.get(context, path);

            RemoteViews updated = new RemoteViews(context.getPackageName(), R.layout.widget_recipes);
            updated.setOnClickPendingIntent(R.id.widget_recipes_root, openAppPendingIntent(context));

            if (rows == null) {
                updated.setTextViewText(R.id.widget_recipes_value, "--");
                updated.setTextViewText(R.id.widget_recipes_subtitle, context.getString(R.string.widget_error));
                for (int viewId : ITEM_VIEW_IDS) {
                    updated.setViewVisibility(viewId, View.GONE);
                }
            } else {
                int total = rows.length();
                updated.setTextViewText(R.id.widget_recipes_value, total + (total == 1 ? " ricetta" : " ricette"));
                updated.setTextViewText(R.id.widget_recipes_subtitle, total == 0 ? "Nessuna ricetta ancora" : "Ultime salvate:");

                for (int i = 0; i < ITEM_VIEW_IDS.length; i++) {
                    JSONObject row = i < rows.length() ? rows.optJSONObject(i) : null;
                    if (row == null) {
                        updated.setViewVisibility(ITEM_VIEW_IDS[i], View.GONE);
                        continue;
                    }
                    String name = row.optString("name", "");
                    updated.setTextViewText(ITEM_VIEW_IDS[i], "• " + name);
                    updated.setViewVisibility(ITEM_VIEW_IDS[i], View.VISIBLE);
                }
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
