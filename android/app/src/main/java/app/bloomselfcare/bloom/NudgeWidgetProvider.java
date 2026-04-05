package app.bloomselfcare.bloom;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class NudgeWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "BloomWidgetData";

    // Gentle voice affirmations (default)
    private static final String[] AFFIRMATIONS_GENTLE = {
            "You are enough.",
            "You showed up. That matters.",
            "Be gentle with yourself today.",
            "You are worthy of rest.",
            "One moment at a time.",
            "You don't have to have it figured out.",
            "Your feelings are valid.",
            "It's okay to take things slow.",
            "You belong here.",
            "Breathing is enough right now.",
            "You're doing better than you think.",
            "Small steps are still steps.",
            "You deserve kindness, especially from yourself.",
            "This moment will pass. You'll be okay.",
            "You are not your worst day."
    };

    // Real/direct voice affirmations
    private static final String[] AFFIRMATIONS_REAL = {
            "You showed up.",
            "That's already something.",
            "Today doesn't have to be perfect.",
            "You're allowed to just see what happens.",
            "You're here. That's enough.",
            "Not every day has to mean something.",
            "You don't owe anyone an explanation.",
            "You're still going. That counts.",
            "Give yourself a break.",
            "It's fine to not be fine.",
            "Done is better than perfect.",
            "You don't have to earn rest.",
            "Progress isn't always visible.",
            "Just keep showing up.",
            "You've survived every bad day so far."
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String voice = prefs.getString("voicePreference", "reflective");

        // Pick affirmation based on day of year so it changes daily but stays consistent within a day
        int dayOfYear = java.time.LocalDate.now().getDayOfYear();
        String[] pool = "real".equals(voice) ? AFFIRMATIONS_REAL : AFFIRMATIONS_GENTLE;
        String affirmation = pool[dayOfYear % pool.length];

        // Allow override from JS bridge
        String custom = prefs.getString("customNudge", "");
        if (!custom.isEmpty()) {
            affirmation = custom;
        }

        for (int widgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.nudge_widget_layout);
            views.setTextViewText(R.id.nudge_text, affirmation);

            // Tap opens the app
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context, 100, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.nudge_widget_root, pendingIntent);

            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }
}
