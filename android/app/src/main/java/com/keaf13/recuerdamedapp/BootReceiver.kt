package com.keaf13.recuerdamedapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action == Intent.ACTION_BOOT_COMPLETED || action == Intent.ACTION_LOCKED_BOOT_COMPLETED) {
      Log.i("BootReceiver", "Dispositivo reiniciado. Reprogramando alarmas...")
      try {
        // Lanzar la app en modo headless para reprogramar (JS se encargará)
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
          launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          launchIntent.putExtra("reprogram_alarms", true)
          context.startActivity(launchIntent)
        }
      } catch (e: Exception) {
        Log.e("BootReceiver", "Error al iniciar reprogramación: ${e.message}")
      }
    }
  }
}


