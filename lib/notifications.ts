// lib/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { unifiedAlarmService } from './unifiedAlarmService';

export async function initNotificationSystem() {
  try {
    console.log('[Notifications] Inicializando sistema de notificaciones...');
    
    // Usar el servicio unificado para inicialización
    const success = await unifiedAlarmService.initialize();
    if (success) {
      console.log('[Notifications] ✅ Sistema inicializado con servicio unificado');
      return true;
    } else {
      console.error('[Notifications] ❌ Error inicializando servicio unificado');
      return false;
    }
  } catch (error) {
    console.error('[Notifications] Error inicializando sistema:', error);
    return false;
  }
}

export async function requestPermissions(): Promise<boolean> {
  try {
    console.log('[Notifications] Solicitando permisos de notificación...');
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('[Notifications] Permisos no concedidos, solicitando...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[Notifications] ❌ Permisos de notificación denegados');
      return false;
    }
    
    console.log('[Notifications] ✅ Permisos de notificación concedidos');
    
    // También solicitar permisos de overlay para apertura automática
    try {
      const { overlayPermissionService } = await import('./overlayPermissionService');
      const overlayGranted = await overlayPermissionService.requestOverlayPermission();
      
      if (overlayGranted) {
        console.log('[Notifications] ✅ Permisos de overlay concedidos');
      } else {
        console.log('[Notifications] ⚠️ Permisos de overlay no concedidos');
      }
    } catch (overlayError) {
      console.log('[Notifications] ⚠️ Error solicitando permisos de overlay:', overlayError);
    }
    
    return true;
  } catch (error) {
    console.error('[Notifications] Error solicitando permisos:', error);
    return false;
  }
}

export async function scheduleMedicationReminder({
  title,
  body,
  date,
  data
}: {
  title: string;
  body: string;
  date: Date;
  data: any;
}): Promise<string | null> {
  try {
    const notificationId = `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return await unifiedAlarmService.scheduleAlarm({
      id: notificationId,
      title,
      body,
      data: {
        ...data,
        type: 'MEDICATION',
        kind: 'MED',
      },
      triggerDate: date,
      channelId: 'medications'
    });
  } catch (error) {
    console.error('[Notifications] Error programando recordatorio de medicamento:', error);
    return null;
  }
}

export async function scheduleAppointmentReminder({
  title,
  body,
  date,
  data
}: {
  title: string;
  body: string;
  date: Date;
  data: any;
}): Promise<string | null> {
  try {
    const notificationId = `appt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return await unifiedAlarmService.scheduleAlarm({
      id: notificationId,
      title,
      body,
      data: {
        ...data,
        type: 'APPOINTMENT',
        kind: 'APPOINTMENT',
      },
      triggerDate: date,
      channelId: 'appointments'
    });
  } catch (error) {
    console.error('[Notifications] Error programando recordatorio de cita:', error);
    return null;
  }
}

export async function scheduleNotification({
  id,
  title,
  body,
  data,
  date,
  seconds,
  sound = 'alarm.mp3',
  channelId = 'alarms'
}: {
  id: string;
  title: string;
  body: string;
  data: any;
  date?: Date;
  seconds?: number;
  sound?: string;
  channelId?: string;
}): Promise<string | null> {
  try {
    let triggerDate: Date;
    
    if (seconds) {
      triggerDate = new Date(Date.now() + seconds * 1000);
    } else if (date) {
      triggerDate = date;
    } else {
      throw new Error('Debe proporcionar date o seconds');
    }
    
    return await unifiedAlarmService.scheduleAlarm({
      id,
      title,
      body,
      data,
      triggerDate,
      channelId
    });
  } catch (error) {
    console.error('[Notifications] Error programando notificación:', error);
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<boolean> {
  try {
    return await unifiedAlarmService.cancelAlarm(notificationId);
  } catch (error) {
    console.error('[Notifications] Error cancelando notificación:', error);
    return false;
  }
}

export async function cancelAllNotifications(): Promise<boolean> {
  try {
    return await unifiedAlarmService.cancelAllAlarms();
  } catch (error) {
    console.error('[Notifications] Error cancelando todas las notificaciones:', error);
    return false;
  }
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await unifiedAlarmService.getScheduledAlarms();
  } catch (error) {
    console.error('[Notifications] Error obteniendo notificaciones programadas:', error);
    return [];
  }
}

export async function getNotificationStats(): Promise<{
  total: number;
  medications: number;
  appointments: number;
  alarms: number;
}> {
  try {
    const notifications = await getScheduledNotifications();
    let medications = 0;
    let appointments = 0;
    let alarms = 0;
    
    for (const notification of notifications) {
      const data = notification.content.data;
      if (data?.type === 'MEDICATION' || data?.kind === 'MED') {
        medications++;
      } else if (data?.type === 'APPOINTMENT' || data?.kind === 'APPOINTMENT') {
        appointments++;
      } else {
        alarms++;
      }
    }
    
    return {
      total: notifications.length,
      medications,
      appointments,
      alarms
    };
  } catch (error) {
    console.error('[Notifications] Error obteniendo estadísticas:', error);
    return { total: 0, medications: 0, appointments: 0, alarms: 0 };
  }
}

export async function getNotificationChannels(): Promise<any[]> {
  try {
    if (Platform.OS === 'android') {
      return await Notifications.getNotificationChannelsAsync();
    } else {
      return []; // iOS no usa canales
    }
  } catch (error) {
    console.error('[Notifications] Error obteniendo canales:', error);
    return [];
  }
}

// Funciones de compatibilidad
export async function scheduleTreatmentReminder({
  title,
  body,
  date,
  data
}: {
  title: string;
  body: string;
  date: Date;
  data: any;
}): Promise<string | null> {
  try {
    const notificationId = `treatment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return await unifiedAlarmService.scheduleAlarm({
      id: notificationId,
      title,
      body,
      data: {
        ...data,
        type: 'TREATMENT',
        kind: 'TREATMENT',
      },
      triggerDate: date,
      channelId: 'alarms'
    });
  } catch (error) {
    console.error('[Notifications] Error programando recordatorio de tratamiento:', error);
    return null;
  }
}

/**
 * Verificar estado completo de permisos para apertura automática
 */
export async function checkAutoOpenPermissions(): Promise<{
  notifications: boolean;
  overlay: boolean;
  allGranted: boolean;
  details: any;
}> {
  try {
    console.log('[Notifications] Verificando permisos de apertura automática...');
    
    // Verificar permisos de notificación
    const { status } = await Notifications.getPermissionsAsync();
    
    const notificationsGranted = status === 'granted';
    
    // Verificar permisos de overlay
    let overlayGranted = false;
    try {
      const { overlayPermissionService } = await import('./overlayPermissionService');
      overlayGranted = await overlayPermissionService.checkOverlayPermission();
    } catch (error) {
      console.log('[Notifications] Error verificando permisos de overlay:', error);
    }
    
    const allGranted = notificationsGranted && overlayGranted;
    
    const details = {
      notifications: {
        status,
        granted: notificationsGranted
      },
      overlay: {
        granted: overlayGranted
      }
    };
    
    console.log('[Notifications] Estado de permisos:', {
      notifications: notificationsGranted,
      overlay: overlayGranted,
      allGranted
    });
    
    return {
      notifications: notificationsGranted,
      overlay: overlayGranted,
      allGranted,
      details
    };
    
  } catch (error: any) {
    console.error('[Notifications] Error verificando permisos:', error);
    return {
      notifications: false,
      overlay: false,
      allGranted: false,
      details: { error: error.message }
    };
  }
}

// Exportar servicio unificado para uso directo
export { unifiedAlarmService };