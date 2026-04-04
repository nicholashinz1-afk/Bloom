package app.bloomselfcare.bloom;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BloomWidget")
public class BloomWidgetPlugin extends Plugin {

    private static final String PREFS_NAME = "BloomWidgetData";

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        if (call.hasOption("daysShownUp")) {
            editor.putInt("daysShownUp", call.getInt("daysShownUp", 0));
        }
        if (call.hasOption("todayMood")) {
            editor.putString("todayMood", call.getString("todayMood", ""));
        }
        if (call.hasOption("growthStage")) {
            editor.putString("growthStage", call.getString("growthStage", "Seed"));
        }
        if (call.hasOption("growthEmoji")) {
            editor.putString("growthEmoji", call.getString("growthEmoji", "\uD83C\uDF31"));
        }

        editor.apply();

        // Trigger widget refresh
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, BloomWidgetProvider.class);
        int[] widgetIds = widgetManager.getAppWidgetIds(widgetComponent);
        if (widgetIds.length > 0) {
            BloomWidgetProvider provider = new BloomWidgetProvider();
            provider.onUpdate(context, widgetManager, widgetIds);
        }

        call.resolve();
    }
}
