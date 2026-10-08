package appinventor.ai_attarus18.CalcoloCandele;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

/**
 * Forza un refresh immediato di tutti i widget WaxPro subito dopo un login,
 * un refresh di sessione o un logout, invece di aspettare il prossimo giro
 * periodico (ogni 30 minuti, il minimo che Android permette).
 */
final class WidgetUpdateScheduler {

    private WidgetUpdateScheduler() {
    }

    static void refreshAllWidgetsNow(Context ctx) {
        requestUpdate(ctx, RevenueWidgetProvider.class);
        requestUpdate(ctx, InventoryWidgetProvider.class);
        requestUpdate(ctx, RecipesWidgetProvider.class);
    }

    private static void requestUpdate(Context ctx, Class<?> providerClass) {
        AppWidgetManager manager = AppWidgetManager.getInstance(ctx);
        ComponentName component = new ComponentName(ctx, providerClass);
        int[] ids = manager.getAppWidgetIds(component);
        if (ids.length == 0) return;

        Intent intent = new Intent(ctx, providerClass);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        ctx.sendBroadcast(intent);
    }
}
