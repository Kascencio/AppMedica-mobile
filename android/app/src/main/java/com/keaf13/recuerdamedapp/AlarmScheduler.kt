package com.keaf13.recuerdamedapp

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AlarmScheduler(private val context: Context) {
  private val alarmManager: AlarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  fun setAlarmClock(triggerAtMillis: Long, requestCode: Int, alarmId: String) {
    try {
      val openIntent = Intent(context, MainActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        putExtra("open_alarm", true)
        putExtra("alarm_id", alarmId)
      }

      val showActivity = PendingIntent.getActivity(
        context, requestCode, openIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      val info = AlarmManager.AlarmClockInfo(triggerAtMillis, showActivity)

      val fireIntent = Intent(context, AlarmFireReceiver::class.java).apply {
        putExtra("alarm_id", alarmId)
      }
      val firePI = PendingIntent.getBroadcast(
        context, requestCode, fireIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      alarmManager.setAlarmClock(info, firePI)
      Log.i("AlarmScheduler", "setAlarmClock at $triggerAtMillis (req=$requestCode, id=$alarmId)")
    } catch (e: Exception) {
      Log.e("AlarmScheduler", "Error setAlarmClock: ${e.message}")
    }
  }

  fun cancel(requestCode: Int) {
    try {
      val firePI = PendingIntent.getBroadcast(
        context, requestCode, Intent(context, AlarmFireReceiver::class.java),
        PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
      )
      if (firePI != null) {
        alarmManager.cancel(firePI)
        Log.i("AlarmScheduler", "Cancelado req=$requestCode")
      }
    } catch (e: Exception) {
      Log.e("AlarmScheduler", "Error cancel: ${e.message}")
    }
  }
}


