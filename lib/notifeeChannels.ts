// lib/notifeeChannels.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Configura el canal de Notifee para alarmas con máxima importancia
 */
export async function setupNotifeeAlarmChannel(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // Evitar Notifee en Expo Go
  if (Constants.appOwnership === 'expo') return true;

  try {
    const mod = await import('@notifee/react-native');
    const notifee: any = (mod as any).default ?? mod;
    const { AndroidImportance, AndroidVisibility } = mod as any;

    // Android 13+: solicitar permiso de notificaciones
    try {
      await notifee.requestPermission();
    } catch {}

    await notifee.createChannel({
      id: 'alarm',
      name: 'Alarmas',
      importance: AndroidImportance.MAX,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
      bypassDnd: true,
      sound: 'alarm',
    });

    return true;
  } catch (e) {
    console.log('[NotifeeChannels] Notifee no disponible:', (e as any)?.message || e);
    return false;
  }
}


