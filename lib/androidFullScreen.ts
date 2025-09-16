// lib/androidFullScreen.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export async function displayFullScreenAlarm({ title, body, deepLink }: { title: string; body: string; deepLink: string }) {
  if (Platform.OS !== 'android') return;
  // Evitar cargar Notifee en Expo Go
  if (Constants.appOwnership === 'expo') {
    return;
  }
  let notifee: any;
  let AndroidImportance: any;
  let AndroidCategory: any;
  try {
    const mod = await import('@notifee/react-native');
    notifee = (mod as any).default ?? mod;
    AndroidImportance = (mod as any).AndroidImportance;
    AndroidCategory = (mod as any).AndroidCategory;
  } catch (e) {
    console.log('[FullScreen] Notifee no disponible, omitiendo full-screen:', e?.message || e);
    return;
  }

  try {
    const channelId = await notifee.createChannel({
      id: 'alarms',
      name: 'Alarmas',
      sound: 'alarm',
      importance: AndroidImportance.MAX,
      bypassDnd: true,
    });

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        category: AndroidCategory.ALARM,
        ongoing: true,
        fullScreenAction: { id: 'open-alarm' },
        pressAction: { id: 'open', launchActivity: 'default' },
      },
      data: { deepLink },
    });
  } catch (e) {
    console.log('[FullScreen] Error usando Notifee (probablemente Expo Go):', e?.message || e);
  }
}


