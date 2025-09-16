// lib/scheduleExactAlarm.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type Params = Record<string, any>;

export async function scheduleExactAlarm(id: string, date: Date, params: Params = {}): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Constants.appOwnership === 'expo') return false;

  try {
    const mod = await import('@notifee/react-native');
    const notifee: any = (mod as any).default ?? mod;
    const { TriggerType, AndroidCategory, AndroidImportance, AlarmType } = mod as any;

    // Asegurar canal alarm
    const channelId = await notifee.createChannel({
      id: 'alarm',
      name: 'Alarmas',
      importance: AndroidImportance.MAX,
      bypassDnd: true,
      vibration: true,
      sound: 'alarm',
    });

    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: date.getTime(),
      alarmManager: {
        allowWhileIdle: true,
        type: AlarmType?.SET_ALARM_CLOCK ?? 4, // fallback por compatibilidad
      },
    } as const;

    await notifee.createTriggerNotification(
      {
        id,
        title: params.title ?? '¡Hora de tu medicamento!',
        body: params.body ?? 'Toca para abrir la alarma',
        data: { screen: 'Alarm', ...params },
        android: {
          channelId,
          category: AndroidCategory.ALARM,
          ongoing: true,
          autoCancel: false,
          pressAction: { id: 'open-alarm', launchActivity: 'default' },
          // Algunas versiones soportan esto explícitamente
          // @ts-ignore
          fullScreenAction: { id: 'open-alarm', launchActivity: 'default' },
          asForegroundService: true,
          importance: AndroidImportance.MAX,
        },
      },
      trigger
    );
    return true;
  } catch (e) {
    console.log('[scheduleExactAlarm] Error programando alarma exacta:', (e as any)?.message || e);
    return false;
  }
}


