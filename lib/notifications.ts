import * as Notifications from 'expo-notifications';
import { Platform, Linking, Alert, NativeModules } from 'react-native';
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
          notification.request.content.data?.kind === 'APPOINTMENT' ||
          notification.request.content.data?.type === 'APPOINTMENT') {
        
        // Intentar abrir la app automáticamente
        try {
          console.log('[Notifications] Intentando abrir la app automáticamente...');
          // La app se abrirá automáticamente cuando el usuario toque la notificación
          // o cuando el sistema la muestre como alerta
        } catch (error) {
          console.error('[Notifications] Error abriendo app:', error);
        }
        
        return {
          shouldShowBanner: true, // Mostrar banner en el sistema
          shouldShowList: true,   // Mostrar en el panel de notificaciones
          shouldPlaySound: true,  // Reproducir sonido
          shouldSetBadge: true,   // Mostrar badge en el icono de la app
          shouldShowAlert: true,  // Mostrar alerta (importante para apertura automática)
        };
      }
      
      // Para otras notificaciones
      return {
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowAlert: false,
      };
    },
  });
}

// Solicitar permisos
export async function requestPermissions() {
  try {
    if (!Device.isDevice) {
      console.log('[Notifications] No es un dispositivo físico, asumiendo permisos concedidos para pruebas');
      return true;
    }

    // Verificar permisos existentes
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[Notifications] Estado actual de permisos:', existingStatus);
    
    let finalStatus = existingStatus;
    
    // Si no están concedidos, solicitarlos con configuración completa
    if (existingStatus !== 'granted') {
      console.log('[Notifications] Solicitando permisos completos...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true, // Para alarmas críticas
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        }
      });
      finalStatus = status;
      console.log('[Notifications] Nuevo estado de permisos:', status);
    }
    
    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permisos no otorgados');
      return false;
    }

    // Solicitar permisos adicionales para Android
    if (Platform.OS === 'android') {
      await requestAndroidSpecificPermissions();
    }
    
    // Configurar canales de notificación después de obtener permisos
    if (Platform.OS === 'android') {
      try {
        const { setupNotificationChannels } = await import('./notificationChannels');
        await setupNotificationChannels();
        console.log('[Notifications] Canales configurados después de obtener permisos');
      } catch (error) {
        console.error('[Notifications] Error configurando canales después de permisos:', error);
      }
    }
    
    // Configurar canales de Android
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'General',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
        
        // Canal específico para medicamentos
        await Notifications.setNotificationChannelAsync('medications', {
          name: 'Medicamentos',
          description: 'Recordatorios de medicamentos',
          importance: Notifications.AndroidImportance.MAX, // Máxima importancia
          vibrationPattern: [0, 500, 250, 500, 250, 500], // Vibración más intensa
          lightColor: '#059669',
          sound: 'alarm.mp3', // Usar sonido personalizado
          enableVibrate: true,
          enableLights: true,
          bypassDnd: true, // Pasar el modo No Molestar
          showBadge: true, // Mostrar badge
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Visible en pantalla de bloqueo
          // Configuraciones adicionales para mejor apertura automática
        });
        
        // Canal específico para citas
        await Notifications.setNotificationChannelAsync('appointments', {
          name: 'Citas',
          description: 'Recordatorios de citas médicas',
          importance: Notifications.AndroidImportance.MAX, // Máxima importancia
          vibrationPattern: [0, 500, 250, 500, 250, 500], // Vibración más intensa
          lightColor: '#2563eb',
          sound: 'alarm.mp3', // Usar sonido personalizado
          enableVibrate: true,
          enableLights: true,
          bypassDnd: true, // Pasar el modo No Molestar
          showBadge: true, // Mostrar badge
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Visible en pantalla de bloqueo
          // Configuraciones adicionales para mejor apertura automática
        });
        
        console.log('[Notifications] Canales de Android configurados correctamente');
      } catch (error) {
        console.error('[Notifications] Error configurando canales de Android:', error);
      }
    }
    
    console.log('[Notifications] Permisos configurados correctamente');
    return true;
  } catch (error) {
    console.error('[Notifications] Error solicitando permisos:', error);
    return false;
  }
}

// Solicitar permisos específicos de Android
async function requestAndroidSpecificPermissions() {
  try {
    console.log('[Notifications] Solicitando permisos específicos de Android...');
    
    // Verificar permisos de alarmas exactas (Android 12+)
    console.log('[Notifications] Verificando permisos de alarmas exactas...');
    
    // Mostrar información sobre permisos de alarmas exactas
    Alert.alert(
      'Configuración de Alarmas',
      'Para que las alarmas funcionen correctamente, asegúrate de que RecuerdaMed tenga permisos de "Alarmas exactas" en la configuración del sistema.',
      [
        { text: 'Entendido', style: 'default' },
        { text: 'Ir a Configuración', onPress: () => Linking.openSettings() }
      ]
    );

    // Solicitar desactivar optimización de batería
    await requestBatteryOptimizationExemption();
    
  } catch (error) {
    console.error('[Notifications] Error solicitando permisos específicos de Android:', error);
  }
}

// Solicitar exención de optimización de batería
async function requestBatteryOptimizationExemption() {
  try {
    console.log('[Notifications] Informando sobre optimización de batería...');
    
    // Mostrar información sobre optimización de batería
    Alert.alert(
      'Optimización de Batería',
      'Para que las alarmas funcionen correctamente, te recomendamos desactivar la optimización de batería para RecuerdaMed. Ve a Configuración > Batería > Optimización de batería > RecuerdaMed > No optimizar.',
      [
        { text: 'Entendido', style: 'default' },
        { text: 'Ir a Configuración', onPress: () => Linking.openSettings() }
      ]
    );
  } catch (error) {
    console.error('[Notifications] Error informando sobre optimización de batería:', error);
  }
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
    const createdAt = new Date().toISOString();
    const notificationData = { ...data, createdAt };

    // Programar notificación
    const scheduledId = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title,
        body,
        data: notificationData,
        sound: (channelId === 'medications' || channelId === 'appointments') ? 'alarm.mp3' : 'default', // Usar sonido personalizado para alarmas
        priority: Notifications.AndroidNotificationPriority.MAX, // Máxima prioridad para alarmas
        vibrate: [0, 500, 250, 500, 250, 500], // Vibración más intensa para alarmas
        categoryIdentifier: channelId, // Usar categoryIdentifier en lugar de channelId
        sticky: false, // No hacer la notificación persistente
        autoDismiss: false, // No permitir que se cierre automáticamente para alarmas
        // Configuración adicional para mejor apertura automática
        badge: 1, // Mostrar badge
        launchImageName: 'SplashScreen', // Para iOS
        // Configuración específica para Android
        ...(Platform.OS === 'android' && {
          // Configuración para que la notificación abra la app automáticamente
          fullScreenIntent: true, // Mostrar en pantalla completa
          headsUp: true, // Mostrar como heads-up notification
          ongoing: false, // No hacer la notificación persistente
          autoCancel: false, // No cancelar automáticamente
          // Configuraciones adicionales para mejor apertura automática
          priority: Notifications.AndroidNotificationPriority.MAX, // Máxima prioridad
          visibility: Notifications.AndroidNotificationVisibility.PUBLIC, // Visible en pantalla de bloqueo
          showTimestamp: true, // Mostrar timestamp
          localOnly: false, // Permitir sincronización con otros dispositivos
        }),
      },
      trigger,
    });

    // Guardar en almacenamiento local para persistencia
    await saveNotificationToStorage(notificationId, {
      title,
      body,
      data: notificationData,
      trigger,
      scheduledId,
      channelId,
      createdAt,
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
    const { CustomAlarm } = NativeModules;
    if (Platform.OS === 'android' && CustomAlarm) {
        console.log('[Notifications] Usando CustomAlarm para Android');

        let hours: number, minutes: number;
        if (time.includes(':')) {
            const timeParts = time.split(':');
            hours = parseInt(timeParts[0], 10);
            minutes = parseInt(timeParts[1], 10);
        } else {
            console.log('[Notifications] Formato de hora no reconocido para CustomAlarm:', time);
            return;
        }

        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            console.log('[Notifications] Hora inválida para CustomAlarm:', time);
            return;
        }

        let triggerDate = new Date();
        triggerDate.setHours(hours, minutes, 0, 0);

        if (triggerDate.getTime() <= Date.now()) {
            triggerDate.setDate(triggerDate.getDate() + 1);
        }

        if (startDate && new Date(startDate).getTime() > triggerDate.getTime()) {
            triggerDate = new Date(startDate);
            triggerDate.setHours(hours, minutes, 0, 0);
        }

        CustomAlarm.schedule({
            title: `💊 ${name}`,
            body: `Es hora de tomar ${dosage}`,
            kind: 'MEDICATION',
            refId: id,
            name,
            dosage,
            time,
            instructions: dosage,
            scheduledFor: triggerDate.toISOString(),
            timestamp: triggerDate.getTime(),
        });
        return;
    }
    // Validaciones básicas
    if (!id || !name || !dosage || !time) {
      console.log('[Notifications] Datos incompletos para programar medicamento:', { id, name, dosage, time });
      return;
    }

    // Cancelar notificaciones existentes para este medicamento
    await cancelMedicationNotifications(id);
    
    // Parsear la hora correctamente
    let hours: number, minutes: number;
    
    if (time.includes(':')) {
      const timeParts = time.split(':');
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    } else if (time.includes(' ')) {
      // Formato con AM/PM
      const [timeStr, period] = time.split(' ');
      const [h, m] = timeStr.split(':').map(Number);
      hours = period.toUpperCase() === 'PM' && h !== 12 ? h + 12 : h;
      minutes = m;
    } else {
      console.log('[Notifications] Formato de hora no reconocido:', time);
      return;
    }
    
    // Validar que las horas y minutos sean válidos
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.log('[Notifications] Hora inválida:', time, '-> horas:', hours, 'minutos:', minutes);
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
    
    // Programar notificación diaria recurrente (más estable que notificaciones únicas)
    if (frequency === 'daily') {
      try {
        const dailyNotificationId = `med_${id}_daily_${hours}_${minutes}`;
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
            // Datos adicionales para AlarmScreen
            appointmentId: null,
            doctorName: null,
            notes: dosage,
            location: null,
            scheduledFor: firstNotification.toISOString(),
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
    } else {
      // Para frecuencias no diarias, programar notificación única
      try {
        const singleNotificationId = `med_${id}_single_${Date.now()}`;
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
          identifier: singleNotificationId,
          channelId: 'medications',
        });
        
        console.log(`[Notifications] Notificación única programada: ${name} para ${firstNotification.toISOString()}`);
      } catch (error) {
        console.error('[Notifications] Error programando notificación única:', error);
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
    const { CustomAlarm } = NativeModules;
    if (Platform.OS === 'android' && CustomAlarm) {
        console.log('[Notifications] Usando CustomAlarm para Android para citas');
        const triggerDate = new Date(dateTime);
        CustomAlarm.schedule({
            title: `📅 Cita: ${title}`,
            body: `Es hora de tu cita. Ubicación: ${location}`,
            kind: 'APPOINTMENT',
            refId: id,
            name: title,
            location: location,
            scheduledFor: triggerDate.toISOString(),
            timestamp: triggerDate.getTime(),
        });
        return;
    }
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
          kind: 'APPOINTMENT',
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
        kind: 'APPOINTMENT',
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
      const storedNotification = stored[notification.identifier];
      const createdAtStr = notification.content.data?.createdAt || storedNotification?.createdAt;
      if (createdAtStr) {
        const createdAt = new Date(createdAtStr);
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

// Verificar salud del sistema de notificaciones
export async function checkNotificationHealth(): Promise<{
  permissions: boolean;
  channels: boolean;
  scheduled: number;
  errors: string[];
}> {
  const health = {
    permissions: false,
    channels: false,
    scheduled: 0,
    errors: [] as string[]
  };

  try {
    // Verificar permisos
    const { status } = await Notifications.getPermissionsAsync();
    health.permissions = status === 'granted';
    
    if (!health.permissions) {
      health.errors.push('Permisos de notificaciones no concedidos');
    }

    // Verificar canales en Android
    if (Platform.OS === 'android') {
      try {
        const channels = await Notifications.getNotificationChannelsAsync();
        health.channels = channels.length > 0;
        
        if (!health.channels) {
          health.errors.push('Canales de notificaciones no configurados');
        }
      } catch (error) {
        health.errors.push('Error verificando canales de notificaciones');
      }
    } else {
      health.channels = true; // iOS no usa canales
    }

    // Verificar notificaciones programadas
    try {
      const scheduled = await getScheduledNotifications();
      health.scheduled = scheduled.length;
    } catch (error) {
      health.errors.push('Error obteniendo notificaciones programadas');
    }

    console.log('[Notifications] Estado de salud:', health);
    return health;
  } catch (error) {
    console.error('[Notifications] Error verificando salud del sistema:', error);
    health.errors.push('Error general verificando salud del sistema');
    return health;
  }
}

// Reparar sistema de notificaciones
export async function repairNotificationSystem(): Promise<boolean> {
  try {
    console.log('[Notifications] Iniciando reparación del sistema...');
    
    // Verificar salud actual
    const health = await checkNotificationHealth();
    
    // Reparar permisos si es necesario
    if (!health.permissions) {
      console.log('[Notifications] Reparando permisos...');
      const permissionsGranted = await requestPermissions();
      if (!permissionsGranted) {
        console.error('[Notifications] No se pudieron obtener permisos');
        return false;
      }
    }
    
    // Reparar canales si es necesario
    if (!health.channels && Platform.OS === 'android') {
      console.log('[Notifications] Reparando canales...');
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'General',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
        
        await Notifications.setNotificationChannelAsync('medications', {
          name: 'Medicamentos',
          description: 'Recordatorios de medicamentos',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#059669',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
        });
        
        await Notifications.setNotificationChannelAsync('appointments', {
          name: 'Citas',
          description: 'Recordatorios de citas médicas',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 500, 250],
          lightColor: '#2563eb',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
        });
        
        console.log('[Notifications] Canales reparados correctamente');
      } catch (error) {
        console.error('[Notifications] Error reparando canales:', error);
        return false;
      }
    }
    
    console.log('[Notifications] Reparación completada');
    return true;
  } catch (error) {
    console.error('[Notifications] Error en reparación del sistema:', error);
    return false;
  }
}
