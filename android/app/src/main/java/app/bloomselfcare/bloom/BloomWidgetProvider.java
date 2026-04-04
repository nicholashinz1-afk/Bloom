package app.bloomselfcare.bloom;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class BloomWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "BloomWidgetData";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        for (int widgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.bloom_widget_layout);

            // Read stored data from SharedPreferences
            int daysShownUp = prefs.getInt("daysShownUp", 0);
            String mood = prefs.getString("todayMood", "");
            String growthStage = prefs.getString("growthStage", "Seed");
            String growthEmoji = prefs.getString("growthEmoji", "\uD83C\uDF31"); // 🌱

            // Update text views
            views.setTextViewText(R.id.widget_streak,
                    "\uD83C\uDF31 " + daysShownUp + (daysShownUp == 1 ? " day shown up" : " days shown up"));

            if (mood.isEmpty()) {
                views.setTextViewText(R.id.widget_mood, "Tap to check in");
            } else {
                views.setTextViewText(R.id.widget_mood, "Today: " + mood);
            }

            views.setTextViewText(R.id.widget_stage, growthEmoji + " " + growthStage);

            // Tap opens the app
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }
}
