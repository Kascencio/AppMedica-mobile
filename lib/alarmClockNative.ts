// lib/alarmClockNative.ts
import { NativeModules, Platform } from 'react-native';

const { AlarmSchedulerModule } = NativeModules as any;

export function hasNativeAlarmClock(): boolean {
  return Platform.OS === 'android' && !!AlarmSchedulerModule;
}

export async function setAlarmClockNative(triggerAtMs: number, requestCode: number, alarmId: string): Promise<boolean> {
  if (!hasNativeAlarmClock()) return false;
  try {
    await AlarmSchedulerModule.setAlarmClock(triggerAtMs, requestCode, alarmId);
    return true;
  } catch (e) {
    return false;
  }
}

export async function cancelAlarmClockNative(requestCode: number): Promise<boolean> {
  if (!hasNativeAlarmClock()) return false;
  try {
    await AlarmSchedulerModule.cancel(requestCode);
    return true;
  } catch (e) {
    return false;
  }
}


