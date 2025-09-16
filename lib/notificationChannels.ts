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

    // Canal para medicamentos - MÁXIMA PRIORIDAD PARA APERTURA AUTOMÁTICA
    await Notifications.setNotificationChannelAsync('medications', {
      name: 'Medicamentos',
      description: 'Recordatorios de medicamentos - Apertura automática habilitada',
      importance: Notifications.AndroidImportance.MAX, // Máxima prioridad
      vibrationPattern: [0, 500, 250, 500, 250, 500, 250, 500], // Patrón más largo
      lightColor: '#059669',
      sound: 'alarm.mp3', // Usar sonido personalizado
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true, // Pasar el modo No Molestar
      showBadge: true, // Mostrar badge
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Visible en pantalla de bloqueo
      showOnLockScreen: true, // Mostrar en pantalla de bloqueo
      // Configuraciones críticas para apertura automática
      canBypassDnd: true, // Pasar el modo No Molestar
      canShowBadge: true, // Mostrar badge
      enableSound: true, // Habilitar sonido
      // Configuraciones adicionales para mejor apertura automática
      enableBypassDnd: true, // Pasar el modo No Molestar
      enableLights: true, // Luces LED
      enableVibrate: true, // Vibración
      // Configuraciones específicas para apertura automática cuando app está minimizada
      fullScreenIntent: true, // Permitir pantalla completa
      autoCancel: false, // No cancelar automáticamente
      ongoing: true, // Notificación persistente
      showTimestamp: true, // Mostrar timestamp
      // Configuraciones de visibilidad
      visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      // Configuraciones de prioridad
      priority: Notifications.AndroidNotificationPriority.MAX,
    });

    // Canal para citas - MÁXIMA PRIORIDAD PARA APERTURA AUTOMÁTICA
    await Notifications.setNotificationChannelAsync('appointments', {
      name: 'Citas',
      description: 'Recordatorios de citas médicas - Apertura automática habilitada',
      importance: Notifications.AndroidImportance.MAX, // Máxima prioridad
      vibrationPattern: [0, 250, 500, 250, 500, 250, 500, 250], // Patrón más largo
      lightColor: '#2563eb',
      sound: 'alarm.mp3', // Usar sonido personalizado
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true, // Pasar el modo No Molestar
      showBadge: true, // Mostrar badge
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Visible en pantalla de bloqueo
      showOnLockScreen: true, // Mostrar en pantalla de bloqueo
      // Configuraciones críticas para apertura automática
      canBypassDnd: true, // Pasar el modo No Molestar
      canShowBadge: true, // Mostrar badge
      enableSound: true, // Habilitar sonido
      // Configuraciones adicionales para mejor apertura automática
      enableBypassDnd: true, // Pasar el modo No Molestar
      enableLights: true, // Luces LED
      enableVibrate: true, // Vibración
      // Configuraciones específicas para apertura automática cuando app está minimizada
      fullScreenIntent: true, // Permitir pantalla completa
      autoCancel: false, // No cancelar automáticamente
      ongoing: true, // Notificación persistente
      showTimestamp: true, // Mostrar timestamp
      // Configuraciones de visibilidad
      visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      // Configuraciones de prioridad
      priority: Notifications.AndroidNotificationPriority.MAX,
    });

    console.log('[Channels] ✅ Canales configurados correctamente');
    return true;
  } catch (error) {
    console.error('[Channels] ❌ Error configurando canales:', error);
    return false;
  }
}

// Asegura el canal genérico de alarmas
export async function ensureAlarmChannel() {
  try {
    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Alarmas',
      description: 'Alarmas generales',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#FF0000',
      sound: 'alarm.mp3',
      enableVibrate: true,
      enableLights: true,
      bypassDnd: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch (error) {
    console.error('[Channels] Error asegurando canal alarms:', error);
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
