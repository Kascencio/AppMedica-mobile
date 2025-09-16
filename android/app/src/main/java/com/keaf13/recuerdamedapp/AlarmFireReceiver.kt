package com.keaf13.recuerdamedapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class AlarmFireReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra("alarm_id") ?: "unknown"
    Log.i("AlarmFireReceiver", "Alarm fired id=$alarmId")

    // Abrir Activity en pantalla completa como respaldo (si el sistema no lo abrió)
    try {
      val openIntent = Intent(context, MainActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        putExtra("open_alarm", true)
        putExtra("alarm_id", alarmId)
      }
      context.startActivity(openIntent)
    } catch (e: Exception) {
      Log.e("AlarmFireReceiver", "Error abriendo Activity: ${e.message}")
    }

    // Opcional: podrías iniciar aquí un servicio/FSI/Notifee para mostrar controles
  }
}


