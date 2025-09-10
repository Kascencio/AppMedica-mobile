package com.keaf13.recuerdamedapp;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class CustomAlarmModule extends ReactContextBaseJavaModule {

    private static final String CHANNEL_ID = "medications";

    public CustomAlarmModule(ReactApplicationContext reactContext) {
        super(reactContext);
        createNotificationChannel();
    }

    @Override
    public String getName() {
        return "CustomAlarm";
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Medicamentos";
            String description = "Recordatorios de medicamentos";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(NotificationManager.IMPORTANCE_HIGH);

            NotificationManager notificationManager = getReactApplicationContext().getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    @ReactMethod
    public void schedule(ReadableMap details) {
        ReactApplicationContext context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        Intent intent = new Intent(context, AlarmReceiver.class);
        Bundle bundle = new Bundle();
        bundle.putString("title", details.getString("title"));
        bundle.putString("body", details.getString("body"));
        bundle.putString("kind", details.getString("kind"));
        bundle.putString("refId", details.getString("refId"));
        bundle.putString("name", details.getString("name"));
        bundle.putString("dosage", details.getString("dosage"));
        bundle.putString("instructions", details.getString("instructions"));
        bundle.putString("time", details.getString("time"));
        bundle.putString("location", details.getString("location"));
        bundle.putString("scheduledFor", details.getString("scheduledFor"));
        intent.putExtras(bundle);

        // Use a request code based on the refId to ensure uniqueness
        int requestCode = details.getString("refId").hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        long timestamp = (long) details.getDouble("timestamp");

        // Use setExactAndAllowWhileIdle for precise alarms
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, timestamp, pendingIntent);
        }
    }

    @ReactMethod
    public void cancel(String refId) {
        ReactApplicationContext context = getReactApplicationContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        Intent intent = new Intent(context, AlarmReceiver.class);
        int requestCode = refId.hashCode();
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        alarmManager.cancel(pendingIntent);
    }
}
