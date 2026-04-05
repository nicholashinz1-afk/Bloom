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
        if (call.hasOption("voicePreference")) {
            editor.putString("voicePreference", call.getString("voicePreference", "reflective"));
        }

        editor.apply();

        // Refresh all widget types
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);

        // Quick Glance widget
        ComponentName glanceComponent = new ComponentName(context, BloomWidgetProvider.class);
        int[] glanceIds = widgetManager.getAppWidgetIds(glanceComponent);
        if (glanceIds.length > 0) {
            new BloomWidgetProvider().onUpdate(context, widgetManager, glanceIds);
        }

        // Nudge widget
        ComponentName nudgeComponent = new ComponentName(context, NudgeWidgetProvider.class);
        int[] nudgeIds = widgetManager.getAppWidgetIds(nudgeComponent);
        if (nudgeIds.length > 0) {
            new NudgeWidgetProvider().onUpdate(context, widgetManager, nudgeIds);
        }

        call.resolve();
    }

    @PluginMethod
    public void checkPendingMood(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        JSObject result = new JSObject();
        boolean hasPending = prefs.getBoolean("hasPendingMood", false);
        result.put("hasPendingMood", hasPending);

        if (hasPending) {
            result.put("moodValue", prefs.getInt("pendingMoodValue", -1));
            // Clear the pending flag
            prefs.edit().putBoolean("hasPendingMood", false).apply();
        }

        call.resolve(result);
    }
}
