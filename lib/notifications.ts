import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

// Configurar notificaciones
export function setNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      console.log('[Notifications] Notificación recibida en handler:', notification.request.content);
      
      // Para notificaciones de medicamentos y citas, mostrar alerta y reproducir sonido
      if (notification.request.content.data?.type === 'MEDICATION' || 
          notification.request.content.data?.kind === 'MED' ||
          notification.request.content.data?.kind === 'APPOINTMENT') {
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      }
      
      // Para otras notificaciones
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });
}

// Solicitar permisos
export async function requestPermissions() {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permisos no otorgados');
      return false;
    }
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
      
      // Canal específico para medicamentos
      await Notifications.setNotificationChannelAsync('medications', {
        name: 'Medicamentos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#059669',
        sound: 'default',
      });
      
      // Canal específico para citas
      await Notifications.setNotificationChannelAsync('appointments', {
        name: 'Citas',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 500, 250],
        lightColor: '#2563eb',
        sound: 'default',
      });
    }
    
    return true;
  }
  
  return false;
}

// Programar notificación
export async function scheduleNotification({
  title,
  body,
  data,
  trigger,
  identifier,
  channelId = 'default',
}: {
  title: string;
  body: string;
  data?: any;
  trigger: Notifications.NotificationTriggerInput;
  identifier?: string;
  channelId?: string;
}) {
  try {
    // Generar ID único si no se proporciona
    const notificationId = identifier || `notification_${Date.now()}_${Math.random()}`;
    
    // Programar notificación
    const scheduledId = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title,
        body,
        data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 500, 250, 500, 250, 500], // Vibración más intensa para alarmas
        categoryIdentifier: channelId, // Usar categoryIdentifier para el canal
      },
      trigger,
    });
    
    // Guardar en almacenamiento local para persistencia
    await saveNotificationToStorage(notificationId, {
      title,
      body,
      data,
      trigger,
      scheduledId,
      channelId,
      createdAt: new Date().toISOString(),
    });
    
    console.log(`[Notifications] Notificación programada: ${notificationId} para ${JSON.stringify(trigger)}`);
    return scheduledId;
  } catch (error) {
    console.error('[Notifications] Error programando notificación:', error);
    throw error;
  }
}

// Cancelar notificación específica
export async function cancelNotification(identifier: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await removeNotificationFromStorage(identifier);
    console.log(`[Notifications] Notificación cancelada: ${identifier}`);
  } catch (error) {
    console.error('[Notifications] Error cancelando notificación:', error);
  }
}

// Cancelar todas las notificaciones
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await clearAllNotificationsFromStorage();
    console.log('[Notifications] Todas las notificaciones canceladas');
  } catch (error) {
    console.error('[Notifications] Error cancelando todas las notificaciones:', error);
  }
}

// Obtener notificaciones programadas
export async function getScheduledNotifications() {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Error obteniendo notificaciones programadas:', error);
    return [];
  }
}

// Guardar notificación en almacenamiento local
async function saveNotificationToStorage(id: string, notification: any) {
  try {
    const existing = await AsyncStorage.getItem('scheduledNotifications');
    const notifications = existing ? JSON.parse(existing) : {};
    notifications[id] = notification;
    await AsyncStorage.setItem('scheduledNotifications', JSON.stringify(notifications));
  } catch (error) {
    console.error('[Notifications] Error guardando notificación en almacenamiento:', error);
  }
}

// Remover notificación del almacenamiento local
async function removeNotificationFromStorage(id: string) {
  try {
    const existing = await AsyncStorage.getItem('scheduledNotifications');
    if (existing) {
      const notifications = JSON.parse(existing);
      delete notifications[id];
      await AsyncStorage.setItem('scheduledNotifications', JSON.stringify(notifications));
    }
  } catch (error) {
    console.error('[Notifications] Error removiendo notificación del almacenamiento:', error);
  }
}

// Limpiar todas las notificaciones del almacenamiento
async function clearAllNotificationsFromStorage() {
  try {
    await AsyncStorage.removeItem('scheduledNotifications');
  } catch (error) {
    console.error('[Notifications] Error limpiando notificaciones del almacenamiento:', error);
  }
}

// Restaurar notificaciones desde almacenamiento (útil para app offline)
export async function restoreNotificationsFromStorage() {
  try {
    const stored = await AsyncStorage.getItem('scheduledNotifications');
    if (stored) {
      const notifications = JSON.parse(stored);
      console.log(`[Notifications] Restaurando ${Object.keys(notifications).length} notificaciones desde almacenamiento`);
      
      // Aquí podrías implementar lógica para reprogramar notificaciones
      // que se perdieron durante el tiempo offline
    }
  } catch (error) {
    console.error('[Notifications] Error restaurando notificaciones:', error);
  }
}

// Programar notificación de medicamento - VERSIÓN SIMPLIFICADA Y ESTABLE
export async function scheduleMedicationReminder({
  id,
  name,
  dosage,
  time,
  frequency = 'daily',
  startDate,
  endDate,
  patientProfileId,
}: {
  id: string;
  name: string;
  dosage: string;
  time: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate?: Date;
  endDate?: Date;
  patientProfileId?: string;
}) {
  try {
    // Validaciones básicas
    if (!id || !name || !dosage || !time) {
      console.log('[Notifications] Datos incompletos para programar medicamento:', { id, name, dosage, time });
      return;
    }

    // Cancelar notificaciones existentes para este medicamento
    await cancelMedicationNotifications(id);
    
    const [hours, minutes] = time.split(':').map(Number);
    
    // Validar que las horas y minutos sean válidos
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.log('[Notifications] Hora inválida:', time);
      return;
    }

    const now = new Date();
    
    // Calcular la primera notificación
    let firstNotification = new Date();
    firstNotification.setHours(hours, minutes, 0, 0);
    
    // Si la hora ya pasó hoy, programar para mañana
    if (firstNotification <= now) {
      firstNotification.setDate(firstNotification.getDate() + 1);
    }
    
    // Si hay fecha de inicio, usar esa
    if (startDate) {
      const start = new Date(startDate);
      if (start > firstNotification) {
        firstNotification = start;
        firstNotification.setHours(hours, minutes, 0, 0);
      }
    }
    
    // Verificar que la fecha de fin no haya pasado
    if (endDate && new Date(endDate) <= now) {
      console.log('[Notifications] Fecha de fin ya pasó, no se programa notificación');
      return;
    }
    
    // Programar primera notificación única con manejo de errores
    try {
      const firstNotificationId = `med_${id}_first_${Date.now()}`;
      await scheduleNotification({
        title: `💊 ${name}`,
        body: `Es hora de tomar ${dosage}`,
        data: {
          type: 'MEDICATION',
          medicationId: id,
          medicationName: name,
          dosage,
          time,
          patientProfileId,
          kind: 'MED',
          refId: id,
          scheduledFor: firstNotification.toISOString(),
          name,
          instructions: dosage,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: firstNotification,
        },
        identifier: firstNotificationId,
        channelId: 'medications',
      });
    } catch (error) {
      console.error('[Notifications] Error programando primera notificación:', error);
    }
    
    // Programar notificaciones recurrentes solo si es diario (más estable)
    if (frequency === 'daily') {
      try {
        const dailyNotificationId = `med_${id}_daily`;
        await scheduleNotification({
          title: `💊 ${name}`,
          body: `Es hora de tomar ${dosage}`,
          data: {
            type: 'MEDICATION',
            medicationId: id,
            medicationName: name,
            dosage,
            time,
            patientProfileId,
            kind: 'MED',
            refId: id,
            name,
            instructions: dosage,
          },
                  trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
          identifier: dailyNotificationId,
          channelId: 'medications',
        });
        
        console.log(`[Notifications] Recordatorio diario programado: ${name} a las ${time}`);
      } catch (error) {
        console.error('[Notifications] Error programando notificación diaria:', error);
      }
    }
    
    console.log(`[Notifications] Recordatorio de medicamento programado: ${name} a las ${time} (frecuencia: ${frequency})`);
  } catch (error) {
    console.error('[Notifications] Error programando recordatorio de medicamento:', error);
    // No lanzar el error para evitar cierres de la aplicación
  }
}

// Cancelar todas las notificaciones de un medicamento específico
export async function cancelMedicationNotifications(medicationId: string) {
  try {
    const scheduledNotifications = await getScheduledNotifications();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.medicationId === medicationId || 
          notification.identifier?.includes(`med_${medicationId}`)) {
        await cancelNotification(notification.identifier);
      }
    }
    
    console.log(`[Notifications] Notificaciones canceladas para medicamento ${medicationId}`);
  } catch (error) {
    console.error('[Notifications] Error cancelando notificaciones de medicamento:', error);
  }
}

// Programar notificación de cita - VERSIÓN MEJORADA
export async function scheduleAppointmentReminder({
  id,
  title,
  location,
  dateTime,
  reminderMinutes = 60, // Recordatorio 1 hora antes por defecto
  patientProfileId,
}: {
  id: string;
  title: string;
  location: string;
  dateTime: Date;
  reminderMinutes?: number;
  patientProfileId?: string;
}) {
  try {
    // Cancelar notificaciones existentes para esta cita
    await cancelAppointmentNotifications(id);
    
    const now = new Date();
    const appointmentTime = new Date(dateTime);
    
    // Solo programar si la cita es en el futuro
    if (appointmentTime <= now) {
      console.log('[Notifications] No se puede programar recordatorio para cita pasada');
      return;
    }
    
    // Programar recordatorio
    const reminderTime = new Date(appointmentTime.getTime() - (reminderMinutes * 60 * 1000));
    
    if (reminderTime > now) {
      const reminderId = `appt_${id}_reminder`;
      
      await scheduleNotification({
        title: `📅 Cita: ${title}`,
        body: `Tu cita es en ${reminderMinutes} minutos. Ubicación: ${location}`,
        data: {
          type: 'APPOINTMENT',
          appointmentId: id,
          title,
          location,
          dateTime: appointmentTime.toISOString(),
          patientProfileId,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderTime,
        },
        identifier: reminderId,
        channelId: 'appointments',
      });
      
      console.log(`[Notifications] Recordatorio de cita programado: ${title} en ${reminderMinutes} minutos`);
    }
    
    // Programar notificación para el momento de la cita
    const appointmentId = `appt_${id}_time`;
    await scheduleNotification({
      title: `📅 Cita: ${title}`,
      body: `Es hora de tu cita. Ubicación: ${location}`,
      data: {
        type: 'APPOINTMENT',
        appointmentId: id,
        title,
        location,
        dateTime: appointmentTime.toISOString(),
        patientProfileId,
      },
              trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: appointmentTime,
        },
      identifier: appointmentId,
      channelId: 'appointments',
    });
    
    console.log(`[Notifications] Notificación de cita programada: ${title} a las ${appointmentTime.toLocaleString()}`);
  } catch (error) {
    console.error('[Notifications] Error programando recordatorio de cita:', error);
    throw error;
  }
}

// Cancelar todas las notificaciones de una cita específica
export async function cancelAppointmentNotifications(appointmentId: string) {
  try {
    const scheduledNotifications = await getScheduledNotifications();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.appointmentId === appointmentId || 
          notification.identifier?.includes(`appt_${appointmentId}`)) {
        await cancelNotification(notification.identifier);
      }
    }
    
    console.log(`[Notifications] Notificaciones canceladas para cita ${appointmentId}`);
  } catch (error) {
    console.error('[Notifications] Error cancelando notificaciones de cita:', error);
  }
}

// Programar notificación de posponer medicamento
export async function scheduleSnoozeMedication({
  id,
  name,
  dosage,
  snoozeMinutes = 10,
  patientProfileId,
}: {
  id: string;
  name: string;
  dosage: string;
  snoozeMinutes?: number;
  patientProfileId?: string;
}) {
  try {
    const snoozeTime = new Date(Date.now() + (snoozeMinutes * 60 * 1000));
    const snoozeId = `med_${id}_snooze_${Date.now()}`;
    
    await scheduleNotification({
      title: `⏰ ${name} - Recordatorio pospuesto`,
      body: `Es hora de tomar ${dosage} (pospuesto ${snoozeMinutes} minutos)`,
      data: {
        type: 'MEDICATION_SNOOZE',
        kind: 'MED', // Agregar kind para que App.tsx lo reconozca
        medicationId: id,
        medicationName: name,
        dosage,
        snoozeMinutes,
        patientProfileId,
      },
              trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: snoozeTime,
        },
      identifier: snoozeId,
      channelId: 'medications',
    });
    
    console.log(`[Notifications] Notificación de posponer programada: ${name} en ${snoozeMinutes} minutos`);
    return snoozeId;
  } catch (error) {
    console.error('[Notifications] Error programando notificación de posponer:', error);
    throw error;
  }
}

// Limpiar notificaciones antiguas
export async function cleanupOldNotifications() {
  try {
    const scheduledNotifications = await getScheduledNotifications();
    const storedNotifications = await AsyncStorage.getItem('scheduledNotifications');
    const stored = storedNotifications ? JSON.parse(storedNotifications) : {};
    const now = new Date();
    
    for (const notification of scheduledNotifications) {
      // Buscar createdAt en el almacenamiento local
      const storedNotification = stored[notification.identifier];
      if (storedNotification?.createdAt) {
        const createdAt = new Date(storedNotification.createdAt);
        const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > 30) {
          await cancelNotification(notification.identifier);
          console.log(`[Notifications] Notificación antigua cancelada: ${notification.identifier}`);
        }
      }
    }
  } catch (error) {
    console.error('[Notifications] Error limpiando notificaciones antiguas:', error);
  }
}

// Obtener estadísticas de notificaciones
export async function getNotificationStats() {
  try {
    const scheduledNotifications = await getScheduledNotifications();
    const storedNotifications = await AsyncStorage.getItem('scheduledNotifications');
    const stored = storedNotifications ? JSON.parse(storedNotifications) : {};
    
    return {
      scheduled: scheduledNotifications.length,
      stored: Object.keys(stored).length,
      types: {
        medications: scheduledNotifications.filter(n => n.content.data?.type === 'MEDICATION').length,
        appointments: scheduledNotifications.filter(n => n.content.data?.type === 'APPOINTMENT').length,
        snooze: scheduledNotifications.filter(n => n.content.data?.type === 'MEDICATION_SNOOZE').length,
      }
    };
  } catch (error) {
    console.error('[Notifications] Error obteniendo estadísticas:', error);
    return { scheduled: 0, stored: 0, types: { medications: 0, appointments: 0, snooze: 0 } };
  }
}

// Sincronizar notificaciones locales con el backend
export async function syncNotificationsWithBackend() {
  try {
    const scheduledNotifications = await getScheduledNotifications();
    const storedNotifications = await AsyncStorage.getItem('scheduledNotifications');
    const stored = storedNotifications ? JSON.parse(storedNotifications) : {};
    
    console.log(`[Notifications] Sincronizando ${scheduledNotifications.length} notificaciones locales`);
    
    // Verificar que todas las notificaciones programadas estén en almacenamiento
    for (const notification of scheduledNotifications) {
      if (!stored[notification.identifier]) {
        console.log(`[Notifications] Notificación ${notification.identifier} no encontrada en almacenamiento, agregando...`);
        await saveNotificationToStorage(notification.identifier, {
          title: notification.content.title,
          body: notification.content.body,
          data: notification.content.data,
          trigger: notification.trigger,
          scheduledId: notification.identifier,
          channelId: notification.content.categoryIdentifier || 'default',
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    // Limpiar notificaciones del almacenamiento que ya no existen
    for (const [id, notification] of Object.entries(stored)) {
      const exists = scheduledNotifications.some(n => n.identifier === id);
      if (!exists) {
        console.log(`[Notifications] Notificación ${id} no existe más, removiendo del almacenamiento...`);
        await removeNotificationFromStorage(id);
      }
    }
    
    console.log('[Notifications] Sincronización completada');
  } catch (error) {
    console.error('[Notifications] Error sincronizando notificaciones:', error);
  }
}

// Verificar y reparar notificaciones corruptas
export async function repairNotifications() {
  try {
    const scheduledNotifications = await getScheduledNotifications();
    const storedNotifications = await AsyncStorage.getItem('scheduledNotifications');
    const stored = storedNotifications ? JSON.parse(storedNotifications) : {};
    
    let repaired = 0;
    
    for (const notification of scheduledNotifications) {
      // Verificar que la notificación tenga datos válidos
      if (!notification.content?.title || !notification.content?.body) {
        console.log(`[Notifications] Notificación ${notification.identifier} corrupta, cancelando...`);
        await cancelNotification(notification.identifier);
        repaired++;
        continue;
      }
      
      // Verificar que el trigger sea válido
      if (!notification.trigger) {
        console.log(`[Notifications] Notificación ${notification.identifier} sin trigger válido, cancelando...`);
        await cancelNotification(notification.identifier);
        repaired++;
        continue;
      }
    }
    
    if (repaired > 0) {
      console.log(`[Notifications] ${repaired} notificaciones reparadas`);
    }
    
    return repaired;
  } catch (error) {
    console.error('[Notifications] Error reparando notificaciones:', error);
    return 0;
  }
}
