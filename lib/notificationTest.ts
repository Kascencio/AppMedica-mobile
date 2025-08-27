import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

// Configurar notificaciones de forma segura
export function setNotificationHandler() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('[Notifications] Notificación recibida en handler:', notification.request.content);
        
        // Para notificaciones de medicamentos, mostrar alerta y reproducir sonido
        if (notification.request.content.data?.type === 'MEDICATION') {
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        }
        
        // Para otras notificaciones
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });
  } catch (error) {
    console.error('[Notifications] Error configurando handler:', error);
  }
}

// Solicitar permisos de forma segura
export async function requestPermissions(): Promise<boolean> {
  try {
    if (!Device.isDevice) {
      console.log('[Notifications] No es un dispositivo físico');
      return false;
    }

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
    
    // Configurar canales solo en Android
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
        
        await Notifications.setNotificationChannelAsync('medications', {
          name: 'Medicamentos',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#059669',
          sound: 'default',
        });
      } catch (error) {
        console.error('[Notifications] Error configurando canales:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[Notifications] Error solicitando permisos:', error);
    return false;
  }
}

// Función para probar alarmas de citas específicamente
export async function testAppointmentAlarm(): Promise<boolean> {
  try {
    console.log('[Notifications] Probando alarma de cita...');
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: `appt_test_${Date.now()}`,
      content: {
        title: '📅 Cita con Dr. García',
        body: 'Ubicación: Clínica Central',
        data: {
          type: 'APPOINTMENT',
          kind: 'APPOINTMENT',
          appointmentId: 'test_appt_001',
          doctorName: 'Dr. García',
          location: 'Clínica Central',
          time: '17:30',
          refId: 'test_appt_001',
          scheduledFor: new Date().toISOString(),
          name: 'Dr. García',
          dosage: '',
          instructions: 'Llegar 10 minutos antes',
          notes: 'Consulta de seguimiento',
          isAlarm: true,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 500, 250, 500, 250, 500],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + 3000), // 3 segundos después
      },
    });
    
    console.log('[Notifications] Alarma de cita programada:', notificationId);
    return true;
  } catch (error) {
    console.error('[Notifications] Error en alarma de cita:', error);
    return false;
  }
}

// Función para probar alarmas de medicamentos específicamente
export async function testMedicationAlarm(): Promise<boolean> {
  try {
    console.log('[Notifications] Probando alarma de medicamento...');
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: `med_test_${Date.now()}`,
      content: {
        title: '💊 Paracetamol',
        body: 'Es hora de tomar 500mg',
        data: {
          type: 'MEDICATION',
          kind: 'MED',
          medicationId: 'test_med_001',
          medicationName: 'Paracetamol',
          dosage: '500mg',
          time: '17:30',
          refId: 'test_med_001',
          scheduledFor: new Date().toISOString(),
          name: 'Paracetamol',
          instructions: 'Tomar con agua',
          isAlarm: true,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 500, 250, 500, 250, 500],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + 3000), // 3 segundos después
      },
    });
    
    console.log('[Notifications] Alarma de medicamento programada:', notificationId);
    return true;
  } catch (error) {
    console.error('[Notifications] Error en alarma de medicamento:', error);
    return false;
  }
}

// Función para probar notificaciones inmediatamente
export async function testNotification(): Promise<boolean> {
  try {
    console.log('[Notifications] Probando notificación inmediata...');
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: `test_${Date.now()}`,
      content: {
        title: '🧪 Prueba de Notificación',
        body: 'Esta es una notificación de prueba para verificar que el sistema funciona',
        data: {
          type: 'TEST',
          test: true,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 500, 250, 500],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + 2000), // 2 segundos después
      },
    });
    
    console.log('[Notifications] Notificación de prueba programada:', notificationId);
    return true;
  } catch (error) {
    console.error('[Notifications] Error en notificación de prueba:', error);
    return false;
  }
}

// Programar notificación de forma segura
export async function scheduleNotification({
  title,
  body,
  data,
  trigger,
  identifier,
  sound = true,
}: {
  title: string;
  body: string;
  data?: any;
  trigger: any;
  identifier?: string;
  sound?: boolean;
}): Promise<string | null> {
  try {
    const notificationId = identifier || `notification_${Date.now()}_${Math.random()}`;
    
    const scheduledId = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title,
        body,
        data,
        sound: sound ? 'default' : null,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 500, 250, 500, 250, 500],
        // Configurar sonido personalizado para Android
        ...(Platform.OS === 'android' && sound && {
          sound: 'default',
        }),
      },
      trigger,
    });
    
    console.log(`[Notifications] Notificación programada: ${notificationId}`);
    return scheduledId;
  } catch (error) {
    console.error('[Notifications] Error programando notificación:', error);
    return null;
  }
}

// Programar recordatorio de medicamento de forma segura
export async function scheduleMedicationReminder({
  id,
  name,
  dosage,
  time,
  patientProfileId,
}: {
  id: string;
  name: string;
  dosage: string;
  time: string;
  patientProfileId?: string;
}): Promise<boolean> {
  try {
    // Validaciones básicas
    if (!id || !name || !dosage || !time) {
      console.log('[Notifications] Datos incompletos para programar medicamento');
      return false;
    }

    const [hours, minutes] = time.split(':').map(Number);
    
    // Validar hora
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.log('[Notifications] Hora inválida:', time);
      return false;
    }

    const now = new Date();
    const firstNotification = new Date();
    firstNotification.setHours(hours, minutes, 0, 0);
    
    // Si la hora ya pasó hoy, programar para mañana
    if (firstNotification <= now) {
      firstNotification.setDate(firstNotification.getDate() + 1);
    }
    
    // Programar notificación única con sonido y vibración intensa
    const success = await scheduleNotification({
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
        isAlarm: true, // Marcar como alarma para manejo especial
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: firstNotification,
      },
      identifier: `med_${id}_${Date.now()}`,
      sound: true, // Asegurar que se reproduzca sonido
    });
    
    if (success) {
      console.log(`[Notifications] Recordatorio programado: ${name} a las ${time}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Notifications] Error programando recordatorio de medicamento:', error);
    return false;
  }
}

// Cancelar notificaciones de forma segura
export async function cancelNotification(identifier: string): Promise<boolean> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    console.log(`[Notifications] Notificación cancelada: ${identifier}`);
    return true;
  } catch (error) {
    console.error('[Notifications] Error cancelando notificación:', error);
    return false;
  }
}

// Cancelar todas las notificaciones de forma segura
export async function cancelAllNotifications(): Promise<boolean> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] Todas las notificaciones canceladas');
    return true;
  } catch (error) {
    console.error('[Notifications] Error cancelando todas las notificaciones:', error);
    return false;
  }
}

// Obtener notificaciones programadas de forma segura
export async function getScheduledNotifications(): Promise<any[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Error obteniendo notificaciones programadas:', error);
    return [];
  }
}
