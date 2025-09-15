import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { 
  scheduleMedicationReminder, 
  scheduleAppointmentReminder, 
  getScheduledNotifications,
  getNotificationStats,
  requestPermissions,
  initNotificationSystem
} from '../lib/notifications';
import { alarmErrorHandler } from '../lib/alarmErrorHandler';
import { unifiedAlarmService } from '../lib/unifiedAlarmService';
import { notificationService, ApiNotification, NotificationStats as ApiNotificationStats } from '../lib/notificationService';
import { useCurrentUser } from '../store/useCurrentUser';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface AlarmConfig {
  id: string;
  type: 'medication' | 'appointment' | 'snooze';
  title: string;
  message: string;
  time: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  startDate?: Date;
  endDate?: Date;
  data?: any;
}

export function useAlarms(navigationRef?: any) {
  const [alarms, setAlarms] = useState<any[]>([]);
  const [apiNotifications, setApiNotifications] = useState<ApiNotification[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [apiStats, setApiStats] = useState<ApiNotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const { profile } = useCurrentUser();

  // NavigationRef opcional: el sistema unificado ya maneja navegación en App.tsx

  // Cargar alarmas programadas (locales) con retry
  const loadAlarms = useCallback(async () => {
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        setLoading(true);
        console.log(`[useAlarms] Cargando alarmas locales (intento ${attempt + 1}/${maxRetries})`);
        
        const scheduled = await getScheduledNotifications();
        setAlarms(scheduled);
        
        // Obtener estadísticas locales
        const alarmStats = await getNotificationStats();
        setStats(alarmStats);
        
        console.log(`[useAlarms] Alarmas cargadas exitosamente: ${scheduled.length} notificaciones`);
        return; // Éxito, salir del loop
      } catch (error) {
        console.error(`[useAlarms] Intento ${attempt + 1} falló cargando alarmas locales:`, error);
        
        if (attempt === maxRetries - 1) {
          console.error('[useAlarms] Todos los intentos fallaron cargando alarmas locales');
          // No lanzar error para evitar cierres de la aplicación
        } else {
          // Esperar antes del siguiente intento
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // Cargar notificaciones de la API con retry
  const loadApiNotifications = useCallback(async (filters?: any) => {
    const maxRetries = 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        setApiLoading(true);
        console.log(`[useAlarms] Cargando notificaciones de la API (intento ${attempt + 1}/${maxRetries})`);
        
        const response = await notificationService.getNotifications(filters);
        setApiNotifications(response || []);
        
        console.log(`[useAlarms] Notificaciones de API cargadas exitosamente: ${(response || []).length} items`);
        return response;
      } catch (error) {
        console.error(`[useAlarms] Intento ${attempt + 1} falló cargando notificaciones de la API:`, error);
        
        if (attempt === maxRetries - 1) {
          console.error('[useAlarms] Todos los intentos fallaron cargando notificaciones de la API');
          return null;
        } else {
          // Esperar antes del siguiente intento
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } finally {
        setApiLoading(false);
      }
    }
  }, []);

  // Cargar estadísticas de la API
  const loadApiStats = useCallback(async () => {
    try {
      const apiStatsData = await notificationService.getStats();
      setApiStats(apiStatsData);
      return apiStatsData;
    } catch (error) {
      console.error('[useAlarms] Error cargando estadísticas de la API:', error);
      return null;
    }
  }, []);

  // Verificar salud del sistema de notificaciones
  const checkNotificationHealth = useCallback(async () => {
    try {
      const health = await notificationService.checkHealth();
      console.log('[useAlarms] Estado del sistema:', health);
      return health;
    } catch (error) {
      console.error('[useAlarms] Error verificando salud del sistema:', error);
      return null;
    }
  }, []);

  // Programar alarma de medicamento con integración API
  const scheduleMedicationAlarm = useCallback(async (config: {
    id: string;
    name: string;
    dosage: string;
    time: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    startDate?: Date;
    endDate?: Date;
  }) => {
    try {
      if (!profile?.patientProfileId && !profile?.id) {
        throw new Error('Perfil de usuario no disponible');
      }

      // Parsear la hora configurada
      const { parseTimeString, nextDateAtHourMinute } = await import('../utils/alarmTime');
      const timeData = parseTimeString(config.time);
      if (!timeData) {
        throw new Error(`Hora inválida: ${config.time}`);
      }

      // Calcular la próxima fecha con la hora exacta configurada
      const scheduledDate = nextDateAtHourMinute(timeData.hour, timeData.minute, config.startDate);
      console.log(`[useAlarms] Programando ${config.name} para: ${scheduledDate.toISOString()} (${config.time})`);
      
      await scheduleMedicationReminder({
        title: `⏰ ${config.name}`,
        body: `Es hora de tomar ${config.dosage || 'tu medicamento'}`,
        date: scheduledDate,
        data: {
          type: 'MEDICATION',
          kind: 'MED',
          medicationId: config.id,
          medicationName: config.name,
          dosage: config.dosage,
          patientProfileId: profile.patientProfileId || profile.id,
          scheduledFor: scheduledDate.toISOString(),
          time: config.time,
        }
      });

      // Crear en la API también
      try {
        await notificationService.createMedicationReminder({
          id: config.id,
          name: config.name,
          dosage: config.dosage,
          time: config.time,
          frequency: config.frequency,
          patientProfileId: profile.patientProfileId || profile.id,
        });
      } catch (apiError) {
        console.warn('[useAlarms] Error creando notificación en API, pero programada localmente:', apiError);
      }

      // Recargar alarmas
      await loadAlarms();
      await loadApiNotifications();
      
      return true;
    } catch (error) {
      console.error('[useAlarms] Error programando alarma de medicamento:', error);
      Alert.alert('Error', 'No se pudo programar la alarma del medicamento');
      return false;
    }
  }, [profile?.id, loadAlarms, loadApiNotifications]);

  // Programar alarma de cita con integración API
  const scheduleAppointmentAlarm = useCallback(async (config: {
    id: string;
    title: string;
    location: string;
    dateTime: Date;
    reminderMinutes?: number;
  }) => {
    try {
      if (!profile?.patientProfileId && !profile?.id) {
        throw new Error('Perfil de usuario no disponible');
      }

      // Calcular la fecha del recordatorio con los minutos especificados antes de la cita
      const reminderDate = new Date(config.dateTime.getTime() - (config.reminderMinutes || 60) * 60 * 1000);
      console.log(`[useAlarms] Programando cita ${config.title} para: ${reminderDate.toISOString()} (${config.reminderMinutes || 60} min antes)`);
      
      await scheduleAppointmentReminder({
        title: `📅 ${config.title}`,
        body: `Tu cita es en ${config.location ? `${config.location} - ` : ''}${config.dateTime.toLocaleString()}`,
        date: reminderDate,
        data: {
          type: 'APPOINTMENT',
          kind: 'APPOINTMENT',
          appointmentId: config.id,
          appointmentTitle: config.title,
          location: config.location,
          patientProfileId: profile.patientProfileId || profile.id,
          scheduledFor: config.dateTime.toISOString(),
          reminderMinutes: config.reminderMinutes || 60,
        }
      });

      // Crear en la API también
      try {
        await notificationService.createAppointmentReminder({
          id: config.id,
          title: config.title,
          location: config.location,
          dateTime: config.dateTime,
          patientProfileId: profile.patientProfileId || profile.id,
        });
      } catch (apiError) {
        console.warn('[useAlarms] Error creando notificación en API, pero programada localmente:', apiError);
      }

      // Recargar alarmas
      await loadAlarms();
      await loadApiNotifications();
      
      return true;
    } catch (error) {
      console.error('[useAlarms] Error programando alarma de cita:', error);
      Alert.alert('Error', 'No se pudo programar la alarma de la cita');
      return false;
    }
  }, [profile?.id, loadAlarms, loadApiNotifications]);

  // Posponer medicamento
  const snoozeMedication = useCallback(async (config: {
    id: string;
    name: string;
    dosage: string;
    snoozeMinutes?: number;
  }) => {
    try {
      if (!profile?.id) {
        throw new Error('Perfil de usuario no disponible');
      }

      // Programar alarma pospuesta usando el servicio unificado
      const snoozeId = await unifiedAlarmService.scheduleAlarm({
        id: `snooze_${config.id}_${Date.now()}`,
        title: `🔔 Pospuesto: ${config.name}`,
        body: `Alarma pospuesta ${config.snoozeMinutes || 10} minutos`,
        data: {
          type: 'MEDICATION',
          kind: 'MED',
          medicationId: config.id,
          medicationName: config.name,
          dosage: config.dosage,
          snoozeMinutes: config.snoozeMinutes || 10,
          patientProfileId: profile.patientProfileId || profile.id,
        },
        triggerDate: new Date(Date.now() + (config.snoozeMinutes || 10) * 60 * 1000)
      });

      // Recargar alarmas
      await loadAlarms();
      
      return snoozeId;
    } catch (error) {
      console.error('[useAlarms] Error posponiendo medicamento:', error);
      Alert.alert('Error', 'No se pudo posponer la alarma del medicamento');
      return null;
    }
  }, [profile?.id, loadAlarms]);

  // Cancelar alarma de medicamento
  const cancelMedicationAlarm = useCallback(async (medicationId: string) => {
    try {
      // Cancelar alarmas de medicamento específico
      const scheduledAlarms = await getScheduledNotifications();
      const medicationAlarms = scheduledAlarms.filter(alarm => 
        alarm.content.data?.medicationId === medicationId || 
        alarm.content.data?.type === 'MEDICATION'
      );
      
      for (const alarm of medicationAlarms) {
        await unifiedAlarmService.cancelAlarm(alarm.identifier);
      }
      await loadAlarms();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error cancelando alarma de medicamento:', error);
      return false;
    }
  }, [loadAlarms]);

  // Cancelar alarma de cita
  const cancelAppointmentAlarm = useCallback(async (appointmentId: string) => {
    try {
      // Cancelar alarmas de cita específica
      const scheduledAlarms = await getScheduledNotifications();
      const appointmentAlarms = scheduledAlarms.filter(alarm => 
        alarm.content.data?.appointmentId === appointmentId || 
        alarm.content.data?.type === 'APPOINTMENT'
      );
      
      for (const alarm of appointmentAlarms) {
        await unifiedAlarmService.cancelAlarm(alarm.identifier);
      }
      await loadAlarms();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error cancelando alarma de cita:', error);
      return false;
    }
  }, [loadAlarms]);

  // Marcar notificación de la API como leída
  const markApiNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadApiNotifications();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error marcando notificación como leída:', error);
      return false;
    }
  }, [loadApiNotifications]);

  // Archivar notificación de la API
  const archiveApiNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.archiveNotification(notificationId);
      await loadApiNotifications();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error archivando notificación:', error);
      return false;
    }
  }, [loadApiNotifications]);

  // Marcar múltiples notificaciones como leídas
  const markMultipleAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationService.markMultipleAsRead(notificationIds);
      await loadApiNotifications();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error marcando múltiples como leídas:', error);
      return false;
    }
  }, [loadApiNotifications]);

  // Limpiar alarmas antiguas
  const cleanupAlarms = useCallback(async () => {
    try {
      // await cleanupOldNotifications(); // Función removida
      await loadAlarms();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error limpiando alarmas antiguas:', error);
      return false;
    }
  }, [loadAlarms]);

  // Limpiar notificaciones antiguas de la API
  const cleanupApiNotifications = useCallback(async () => {
    try {
      await notificationService.cleanupOldNotifications();
      await loadApiNotifications();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error limpiando notificaciones de la API:', error);
      return false;
    }
  }, [loadApiNotifications]);

  // Sincronizar cola pendiente
  const syncPendingQueue = useCallback(async () => {
    try {
      await notificationService.syncPendingQueue();
      await loadApiNotifications();
      return true;
    } catch (error) {
      console.error('[useAlarms] Error sincronizando cola pendiente:', error);
      return false;
    }
  }, [loadApiNotifications]);

  // Obtener próximas alarmas
  const getUpcomingAlarms = useCallback(() => {
    const now = new Date();
    return alarms
      .filter(alarm => {
        if (alarm.trigger?.date) {
          return new Date(alarm.trigger.date) > now;
        }
        return true; // Las alarmas recurrentes siempre están activas
      })
      .sort((a, b) => {
        if (a.trigger?.date && b.trigger?.date) {
          return new Date(a.trigger.date).getTime() - new Date(b.trigger.date).getTime();
        }
        return 0;
      })
      .slice(0, 5); // Solo las próximas 5
  }, [alarms]);

  // Obtener alarmas por tipo
  const getAlarmsByType = useCallback((type: string) => {
    return alarms.filter(alarm => alarm.content?.data?.type === type);
  }, [alarms]);

  // Obtener notificaciones de la API por tipo
  const getApiNotificationsByType = useCallback((type: string) => {
    return apiNotifications.filter(notification => notification.type === type);
  }, [apiNotifications]);

  // Verificar si una alarma está activa
  const isAlarmActive = useCallback((identifier: string) => {
    return alarms.some(alarm => alarm.identifier === identifier);
  }, [alarms]);

  // Verificar el estado del sistema de alarmas
  const checkAlarmSystemStatus = useCallback(async () => {
    try {
      const status = {
        permissions: false,
        channels: false,
        scheduledNotifications: 0,
        storageSync: false,
        apiHealth: null as any,
        errors: [] as string[]
      };

      // Verificar permisos
      try {
        const { status: permStatus } = await Notifications.getPermissionsAsync();
        status.permissions = permStatus === 'granted';
        if (!status.permissions) {
          status.errors.push('Permisos de notificación no concedidos');
        }
      } catch (error) {
        status.errors.push('Error verificando permisos');
      }

      // Verificar canales (Android)
      if (Platform.OS === 'android') {
        try {
          const channels = await Notifications.getNotificationChannelsAsync();
          status.channels = channels.length > 0;
          if (!status.channels) {
            status.errors.push('No hay canales de notificación configurados');
          }
        } catch (error) {
          status.errors.push('Error verificando canales');
        }
      } else {
        status.channels = true; // iOS no usa canales
      }

      // Verificar notificaciones programadas
      try {
        const scheduled = await getScheduledNotifications();
        status.scheduledNotifications = scheduled.length;
      } catch (error) {
        status.errors.push('Error obteniendo notificaciones programadas');
      }

      // Verificar sincronización con almacenamiento
      try {
        const stored = await AsyncStorage.getItem('scheduledNotifications');
        const storedCount = stored ? Object.keys(JSON.parse(stored)).length : 0;
        status.storageSync = Math.abs(status.scheduledNotifications - storedCount) <= 1;
        if (!status.storageSync) {
          status.errors.push('Desincronización entre notificaciones y almacenamiento');
        }
      } catch (error) {
        status.errors.push('Error verificando almacenamiento');
      }

      // Verificar salud de la API
      try {
        status.apiHealth = await checkNotificationHealth();
      } catch (error) {
        status.errors.push('Error verificando API de notificaciones');
      }

      return status;
    } catch (error) {
      console.error('[useAlarms] Error verificando estado del sistema:', error);
      return {
        permissions: false,
        channels: false,
        scheduledNotifications: 0,
        storageSync: false,
        apiHealth: null,
        errors: ['Error general verificando sistema']
      };
    }
  }, [checkNotificationHealth]);

  // Reparar sistema de alarmas
  const repairAlarmSystem = useCallback(async () => {
    try {
      console.log('[useAlarms] Iniciando reparación del sistema de alarmas...');
      
      // 1. Verificar y solicitar permisos
      const permissionsGranted = await requestPermissions();
      if (!permissionsGranted) {
        throw new Error('No se pudieron obtener permisos de notificación');
      }

      // 2. Limpiar notificaciones corruptas
      // await cleanupOldNotifications(); // Función removida

      // 3. Sincronizar con almacenamiento
      // await syncNotificationsWithBackend(); // Función removida

      // 4. Reparar notificaciones corruptas
      // Reinicializar sistema de notificaciones
      await initNotificationSystem();

      // 5. Sincronizar cola pendiente de la API
      await syncPendingQueue();

      // 6. Recargar alarmas
      await loadAlarms();
      await loadApiNotifications();

      console.log('[useAlarms] Reparación completada');
      return true;
    } catch (error) {
      console.error('[useAlarms] Error reparando sistema:', error);
      return false;
    }
  }, [loadAlarms, loadApiNotifications, syncPendingQueue]);

  // Cargar alarmas al montar el hook
  useEffect(() => {
    loadAlarms();
    loadApiNotifications();
    loadApiStats();
  }, [loadAlarms, loadApiNotifications, loadApiStats]);

  // Limpiar alarmas antiguas cada día
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupAlarms();
      cleanupApiNotifications();
    }, 24 * 60 * 60 * 1000); // 24 horas

    return () => clearInterval(cleanupInterval);
  }, [cleanupAlarms, cleanupApiNotifications]);

  // Sincronizar cola pendiente cada 5 minutos
  useEffect(() => {
    const syncInterval = setInterval(() => {
      syncPendingQueue();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(syncInterval);
  }, [syncPendingQueue]);

  return {
    // Estado
    alarms,
    apiNotifications,
    stats,
    apiStats,
    loading,
    apiLoading,
    
    // Acciones locales
    loadAlarms,
    scheduleMedicationAlarm,
    scheduleAppointmentAlarm,
    snoozeMedication,
    cancelMedicationAlarm,
    cancelAppointmentAlarm,
    cleanupAlarms,
    
    // Acciones de la API
    loadApiNotifications,
    loadApiStats,
    markApiNotificationAsRead,
    archiveApiNotification,
    markMultipleAsRead,
    cleanupApiNotifications,
    syncPendingQueue,
    checkNotificationHealth,
    
    // Utilidades
    getUpcomingAlarms,
    getAlarmsByType,
    getApiNotificationsByType,
    isAlarmActive,
    checkAlarmSystemStatus,
    repairAlarmSystem,
    
    // Diagnóstico y pruebas
    runAlarmTests: async () => {
      try {
        // Obtener estado del servicio unificado
        const status = unifiedAlarmService.getStatus();
        const scheduledAlarms = await unifiedAlarmService.getScheduledAlarms();
        
        return {
          success: status.isInitialized,
          results: {
            isInitialized: status.isInitialized,
            isAlarmActive: status.isAlarmActive,
            appState: status.appState,
            listenersCount: status.listenersCount,
            scheduledAlarms: scheduledAlarms.length,
            errorStats: alarmErrorHandler.getErrorStats()
          }
        };
      } catch (error) {
        console.error('[useAlarms] Error ejecutando pruebas:', error);
        return { success: false, results: { error: error instanceof Error ? error.message : String(error) } };
      }
    },
    getErrorStats: () => alarmErrorHandler.getErrorStats(),
    clearErrorHistory: () => alarmErrorHandler.clearErrorHistory(),
  };
}
