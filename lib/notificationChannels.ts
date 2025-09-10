import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Configurar canales de notificación para Android
 */
export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') {
    console.log('[Channels] iOS no requiere configuración de canales');
    return true;
  }

  try {
    console.log('[Channels] Configurando canales de notificación...');

    // Canal por defecto
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      description: 'Notificaciones generales',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
    });

    // Canal para medicamentos - ALTA PRIORIDAD
    await Notifications.setNotificationChannelAsync('medications', {
      name: 'Medicamentos',
      description: 'Recordatorios de medicamentos',
      importance: Notifications.AndroidImportance.MAX, // Máxima prioridad
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      lightColor: '#059669',
      sound: 'alarm.mp3', // Usar sonido personalizado
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true, // Pasar el modo No Molestar
      showBadge: true, // Mostrar badge
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Visible en pantalla de bloqueo
      enableSound: true,
      showOnLockScreen: true, // Mostrar en pantalla de bloqueo
    });

    // Canal para citas - ALTA PRIORIDAD
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Citas',
      description: 'Recordatorios de citas médicas',
      importance: Notifications.AndroidImportance.MAX, // Máxima prioridad
      vibrationPattern: [0, 250, 500, 250, 500, 250],
      lightColor: '#2563eb',
      sound: 'alarm.mp3', // Usar sonido personalizado
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true, // Pasar el modo No Molestar
      showBadge: true, // Mostrar badge
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Visible en pantalla de bloqueo
      enableSound: true,
      showOnLockScreen: true, // Mostrar en pantalla de bloqueo
    });

    console.log('[Channels] ✅ Canales configurados correctamente');
    return true;
  } catch (error) {
    console.error('[Channels] ❌ Error configurando canales:', error);
    return false;
  }
}

/**
 * Verificar canales existentes
 */
export async function checkNotificationChannels() {
  try {
    const channels = await Notifications.getNotificationChannelsAsync();
    console.log('[Channels] Canales existentes:', channels.length);
    
    channels.forEach((channel, index) => {
      console.log(`[Channels] ${index + 1}. ${channel.id} - ${channel.name} (${channel.importance})`);
    });
    
    return channels;
  } catch (error) {
    console.error('[Channels] Error verificando canales:', error);
    return [];
  }
}

/**
 * Limpiar y recrear canales
 */
export async function recreateNotificationChannels() {
  try {
    console.log('[Channels] Recreando canales de notificación...');
    
    // Eliminar canales existentes
    const existingChannels = await Notifications.getNotificationChannelsAsync();
    for (const channel of existingChannels) {
      try {
        await Notifications.deleteNotificationChannelAsync(channel.id);
        console.log(`[Channels] Canal eliminado: ${channel.id}`);
      } catch (error) {
        console.log(`[Channels] No se pudo eliminar canal ${channel.id}:`, error);
      }
    }
    
    // Recrear canales
    const success = await setupNotificationChannels();
    
    if (success) {
      console.log('[Channels] ✅ Canales recreados correctamente');
    } else {
      console.log('[Channels] ❌ Error recreando canales');
    }
    
    return success;
  } catch (error) {
    console.error('[Channels] Error recreando canales:', error);
    return false;
  }
}
