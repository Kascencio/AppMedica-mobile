import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { getScheduledNotifications, scheduleMedicationReminder, scheduleAppointmentReminder, repairNotificationSystem, cancelNotification } from './notifications';
import { syncService } from './syncService';
import { localDB, LocalMedication, LocalAppointment } from '../data/db';
import { useCurrentUser } from '../store/useCurrentUser';

// Nombre de la tarea en segundo plano
export const ALARM_BACKGROUND_FETCH_TASK = 'ALARM_BACKGROUND_FETCH_TASK';

// Función para obtener medicamentos desde la base de datos
async function getMedicationsFromDB(): Promise<LocalMedication[]> {
  try {
    console.log('[AlarmTask] Obteniendo medicamentos desde la base de datos...');
    
    // Obtener el perfil del usuario actual
    const profile = useCurrentUser.getState().profile;
    if (!profile?.id) {
      console.log('[AlarmTask] No hay perfil de usuario disponible');
      return [];
    }
    
    // Asegurar que la base de datos esté inicializada
    await localDB.ensureInitialized();
    
    // Obtener medicamentos desde la base de datos local
    const medications = await localDB.getMedications(profile.id);
    
    console.log(`[AlarmTask] Encontrados ${medications.length} medicamentos en la base de datos`);
    return medications;
  } catch (error) {
    console.error('[AlarmTask] Error obteniendo medicamentos:', error);
    return [];
  }
}

// Función para obtener citas desde la base de datos
async function getAppointmentsFromDB(): Promise<LocalAppointment[]> {
  try {
    console.log('[AlarmTask] Obteniendo citas desde la base de datos...');
    
    // Obtener el perfil del usuario actual
    const profile = useCurrentUser.getState().profile;
    const patientId = profile?.patientProfileId || profile?.id;
    if (!patientId) {
      console.log('[AlarmTask] No hay perfil de paciente disponible');
      return [];
    }
    
    // Asegurar que la base de datos esté inicializada
    await localDB.ensureInitialized();
    
    // Obtener citas desde la base de datos local
    const appointments = await localDB.getAppointments(patientId);
    
    console.log(`[AlarmTask] Encontradas ${appointments.length} citas en la base de datos`);
    return appointments;
  } catch (error) {
    console.error('[AlarmTask] Error obteniendo citas:', error);
    return [];
  }
}

// Función para verificar si una notificación ya está programada
async function isNotificationScheduled(identifier: string): Promise<boolean> {
  try {
    const scheduledNotifications = await getScheduledNotifications();
    return scheduledNotifications.some(notification => notification.identifier === identifier);
  } catch (error) {
    console.error('[AlarmTask] Error verificando notificación programada:', error);
    return false;
  }
}

// Función para limpiar notificaciones obsoletas
async function cleanupObsoleteNotifications(medications: LocalMedication[], appointments: LocalAppointment[]) {
  try {
    console.log('[AlarmTask] Limpiando notificaciones obsoletas...');
    
    const scheduledNotifications = await getScheduledNotifications();
    const now = new Date();
    let cleanedCount = 0;
    
    for (const notification of scheduledNotifications) {
      const notificationId = notification.identifier;
      let shouldRemove = false;
      
      // Verificar notificaciones de medicamentos
      if (notificationId.startsWith('med_')) {
        const medicationId = notificationId.split('_')[1];
        const medication = medications.find(med => med.id === medicationId);
        
        if (!medication) {
          // Medicamento ya no existe
          shouldRemove = true;
        } else if (medication.endDate && new Date(medication.endDate) <= now) {
          // Medicamento ya expiró
          shouldRemove = true;
        } else if (medication.startDate && new Date(medication.startDate) > now) {
          // Medicamento aún no ha comenzado
          shouldRemove = true;
        }
      }
      
      // Verificar notificaciones de citas
      if (notificationId.startsWith('appt_')) {
        const appointmentId = notificationId.split('_')[1];
        const appointment = appointments.find(apt => apt.id === appointmentId);
        
        if (!appointment) {
          // Cita ya no existe
          shouldRemove = true;
        } else if (new Date(appointment.dateTime) <= now) {
          // Cita ya pasó
          shouldRemove = true;
        }
      }
      
      if (shouldRemove) {
        console.log(`[AlarmTask] Eliminando notificación obsoleta: ${notificationId}`);
        await cancelNotification(notificationId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[AlarmTask] ${cleanedCount} notificaciones obsoletas eliminadas`);
    }
  } catch (error) {
    console.error('[AlarmTask] Error limpiando notificaciones obsoletas:', error);
  }
}

// Función principal de la tarea en segundo plano
async function performBackgroundAlarmTask() {
  console.log('[AlarmTask] Ejecutando tarea en segundo plano...');
  
  try {
    // 1. Obtener medicamentos y citas del usuario
    const medications = await getMedicationsFromDB();
    const appointments = await getAppointmentsFromDB();
    
    console.log(`[AlarmTask] Encontrados ${medications.length} medicamentos y ${appointments.length} citas`);
    
    // 2. Limpiar notificaciones obsoletas
    await cleanupObsoleteNotifications(medications, appointments);
    
    // 3. Verificar notificaciones ya programadas
    const scheduledNotifications = await getScheduledNotifications();
    console.log(`[AlarmTask] Notificaciones actualmente programadas: ${scheduledNotifications.length}`);
    
    // 4. Reprogramar medicamentos si es necesario
    for (const medication of medications) {
      try {
        // Solo procesar medicamentos que tengan tiempo definido y estén activos
        if (!medication.time || !medication.name || !medication.dosage) {
          console.log(`[AlarmTask] Saltando medicamento ${medication.id} - datos incompletos`);
          continue;
        }
        
        // Verificar si el medicamento está dentro del rango de fechas válido
        const now = new Date();
        if (medication.endDate && new Date(medication.endDate) <= now) {
          console.log(`[AlarmTask] Saltando medicamento ${medication.name} - fecha de fin ya pasó`);
          continue;
        }
        
        if (medication.startDate && new Date(medication.startDate) > now) {
          console.log(`[AlarmTask] Saltando medicamento ${medication.name} - fecha de inicio aún no llega`);
          continue;
        }
        
        const notificationId = `med_${medication.id}_daily_${medication.time.replace(':', '_')}`;
        const isScheduled = await isNotificationScheduled(notificationId);
        
        if (!isScheduled) {
          console.log(`[AlarmTask] Reprogramando notificación para medicamento: ${medication.name}`);
          await scheduleMedicationReminder({
            id: medication.id,
            name: medication.name,
            dosage: medication.dosage,
            time: medication.time,
            frequency: medication.frequency || 'daily',
            startDate: medication.startDate ? new Date(medication.startDate) : undefined,
            endDate: medication.endDate ? new Date(medication.endDate) : undefined,
            patientProfileId: medication.patientProfileId,
          });
        } else {
          console.log(`[AlarmTask] Notificación ya programada para medicamento: ${medication.name}`);
        }
      } catch (error) {
        console.error(`[AlarmTask] Error procesando medicamento ${medication.id}:`, error);
      }
    }
    
    // 5. Reprogramar citas si es necesario
    for (const appointment of appointments) {
      try {
        // Solo procesar citas que tengan fecha y título definidos
        if (!appointment.dateTime || !appointment.title) {
          console.log(`[AlarmTask] Saltando cita ${appointment.id} - datos incompletos`);
          continue;
        }
        
        const appointmentDate = new Date(appointment.dateTime);
        const now = new Date();
        
        // Solo procesar citas futuras
        if (appointmentDate <= now) {
          console.log(`[AlarmTask] Saltando cita ${appointment.title} - ya pasó`);
          continue;
        }
        
        const reminderId = `appt_${appointment.id}_reminder`;
        const timeId = `appt_${appointment.id}_time`;
        const isReminderScheduled = await isNotificationScheduled(reminderId);
        const isTimeScheduled = await isNotificationScheduled(timeId);
        
        if (!isReminderScheduled || !isTimeScheduled) {
          console.log(`[AlarmTask] Reprogramando notificaciones para cita: ${appointment.title}`);
          await scheduleAppointmentReminder({
            id: appointment.id,
            title: appointment.title,
            location: appointment.location || '',
            dateTime: appointmentDate,
            reminderMinutes: 60, // Recordatorio por defecto 1 hora antes
            patientProfileId: appointment.patientProfileId,
          });
        } else {
          console.log(`[AlarmTask] Notificaciones ya programadas para cita: ${appointment.title}`);
        }
      } catch (error) {
        console.error(`[AlarmTask] Error procesando cita ${appointment.id}:`, error);
      }
    }
    
    // 6. Verificar salud del sistema de notificaciones
    try {
      const repairSuccess = await repairNotificationSystem();
      if (repairSuccess) {
        console.log('[AlarmTask] Sistema de notificaciones reparado exitosamente');
      }
    } catch (error) {
      console.error('[AlarmTask] Error reparando sistema de notificaciones:', error);
    }
    
    // 7. Intentar sincronización si es posible
    try {
      await syncService.sync();
      console.log('[AlarmTask] Sincronización completada');
    } catch (error) {
      console.log('[AlarmTask] Sincronización falló (normal en segundo plano):', error.message);
    }
    
    console.log('[AlarmTask] Tarea en segundo plano completada exitosamente');
    return BackgroundFetch.BackgroundFetchResult.NewData;
    
  } catch (error) {
    console.error('[AlarmTask] Error en tarea en segundo plano:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

// Registrar la tarea en segundo plano
TaskManager.defineTask(ALARM_BACKGROUND_FETCH_TASK, performBackgroundAlarmTask);

// Función para registrar la tarea en segundo plano
export async function registerBackgroundAlarmTask() {
  try {
    console.log('[AlarmTask] Registrando tarea en segundo plano...');
    
    // Verificar si la tarea ya está registrada
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ALARM_BACKGROUND_FETCH_TASK);
    
    if (!isRegistered) {
      // Registrar la tarea
      await BackgroundFetch.registerTaskAsync(ALARM_BACKGROUND_FETCH_TASK, {
        minimumInterval: 15 * 60, // 15 minutos (mínimo permitido por el SO)
        stopOnTerminate: false, // Continuar cuando la app se cierre
        startOnBoot: true, // Iniciar cuando el dispositivo se encienda
      });
      
      console.log('[AlarmTask] Tarea en segundo plano registrada exitosamente');
    } else {
      console.log('[AlarmTask] Tarea en segundo plano ya estaba registrada');
    }
    
    return true;
  } catch (error) {
    console.error('[AlarmTask] Error registrando tarea en segundo plano:', error);
    return false;
  }
}

// Función para desregistrar la tarea en segundo plano
export async function unregisterBackgroundAlarmTask() {
  try {
    console.log('[AlarmTask] Desregistrando tarea en segundo plano...');
    
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ALARM_BACKGROUND_FETCH_TASK);
    
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(ALARM_BACKGROUND_FETCH_TASK);
      console.log('[AlarmTask] Tarea en segundo plano desregistrada exitosamente');
    } else {
      console.log('[AlarmTask] Tarea en segundo plano no estaba registrada');
    }
    
    return true;
  } catch (error) {
    console.error('[AlarmTask] Error desregistrando tarea en segundo plano:', error);
    return false;
  }
}

// Función para verificar el estado de la tarea
export async function getBackgroundTaskStatus() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ALARM_BACKGROUND_FETCH_TASK);
    const status = await BackgroundFetch.getStatusAsync();
    
    return {
      isRegistered,
      status,
      canRun: status === BackgroundFetch.BackgroundFetchStatus.Available,
    };
  } catch (error) {
    console.error('[AlarmTask] Error obteniendo estado de la tarea:', error);
    return {
      isRegistered: false,
      status: BackgroundFetch.BackgroundFetchStatus.Denied,
      canRun: false,
    };
  }
}
