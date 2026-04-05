package app.bloomselfcare.bloom;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class MoodWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "BloomWidgetData";
    public static final String ACTION_MOOD = "app.bloomselfcare.bloom.ACTION_MOOD";
    public static final String EXTRA_MOOD_VALUE = "mood_value";

    // Mood values matching Bloom's system: 0=Low, 1=Rough, 2=Okay, 3=Good, 4=Great, -1=Unsure
    private static final int[] MOOD_IDS = {
            R.id.mood_0, R.id.mood_1, R.id.mood_2,
            R.id.mood_3, R.id.mood_4, R.id.mood_unsure
    };
    private static final int[] MOOD_VALUES = { 0, 1, 2, 3, 4, -1 };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.mood_widget_layout);

            // Set up a pending intent for each mood emoji
            for (int i = 0; i < MOOD_IDS.length; i++) {
                Intent intent = new Intent(context, MoodWidgetProvider.class);
                intent.setAction(ACTION_MOOD);
                intent.putExtra(EXTRA_MOOD_VALUE, MOOD_VALUES[i]);
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
                // Use unique request code per mood so intents don't collapse
                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context, MOOD_VALUES[i] + 10, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(MOOD_IDS[i], pendingIntent);
            }

            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (ACTION_MOOD.equals(intent.getAction())) {
            int moodValue = intent.getIntExtra(EXTRA_MOOD_VALUE, -1);

            // Store the mood in SharedPreferences so the web app can read it
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String moodEmoji;
            switch (moodValue) {
                case 0: moodEmoji = "😔 Low"; break;
                case 1: moodEmoji = "😕 Rough"; break;
                case 2: moodEmoji = "😐 Okay"; break;
                case 3: moodEmoji = "🙂 Good"; break;
                case 4: moodEmoji = "😊 Great"; break;
                default: moodEmoji = "🤷 Unsure"; break;
            }
            prefs.edit()
                    .putInt("pendingMoodValue", moodValue)
                    .putString("todayMood", moodEmoji)
                    .putBoolean("hasPendingMood", true)
                    .apply();

            // Also update the Quick Glance widget if present
            AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
            android.content.ComponentName glanceWidget =
                    new android.content.ComponentName(context, BloomWidgetProvider.class);
            int[] glanceIds = widgetManager.getAppWidgetIds(glanceWidget);
            if (glanceIds.length > 0) {
                BloomWidgetProvider provider = new BloomWidgetProvider();
                provider.onUpdate(context, widgetManager, glanceIds);
            }

            // Open the app so the mood gets properly logged through Bloom's system
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            launchIntent.putExtra("fromWidget", true);
            launchIntent.putExtra("widgetMood", moodValue);
            context.startActivity(launchIntent);
        }
    }
}
