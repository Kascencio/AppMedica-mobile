package com.keaf13.recuerdamedapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class AlarmSchedulerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private val scheduler = AlarmScheduler(reactContext)

  override fun getName(): String = "AlarmSchedulerModule"

  @ReactMethod
  fun setAlarmClock(triggerAtMillis: Double, requestCode: Int, alarmId: String, promise: Promise) {
    try {
      scheduler.setAlarmClock(triggerAtMillis.toLong(), requestCode, alarmId)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("set_error", e)
    }
  }

  @ReactMethod
  fun cancel(requestCode: Int, promise: Promise) {
    try {
      scheduler.cancel(requestCode)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("cancel_error", e)
    }
  }
}


