import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { scheduleMedicationReminder, scheduleAppointmentReminder } from './notifications';
import { localDB } from '../data/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

export const ALARM_BACKGROUND_FETCH_TASK = 'ALARM_BACKGROUND_FETCH_TASK';

// 1. Definir la tarea en segundo plano
TaskManager.defineTask(ALARM_BACKGROUND_FETCH_TASK, async () => {
  const now = new Date();
  console.log(`[${ALARM_BACKGROUND_FETCH_TASK}] Tarea ejecutada en segundo plano a las: ${now.toISOString()}`);

  try {
    // La tarea en segundo plano se ejecuta en un contexto diferente, por lo que no podemos usar
    // los hooks de Zustand directamente. Debemos leer desde el almacenamiento persistente.

    // Inicializar la base de datos
    await localDB.ensureInitialized();

    // Obtener el perfil del usuario desde AsyncStorage
    const storedProfile = await AsyncStorage.getItem('userProfile');
    if (!storedProfile) {
      console.log('[Background] No se encontró perfil de usuario. Tarea terminada.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const profile: UserProfile = JSON.parse(storedProfile);
    const patientId = profile?.patientProfileId || profile?.id;

    if (!patientId) {
      console.log('[Background] No se encontró ID de paciente en el perfil. Tarea terminada.');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.log(`[Background] Verificando y reprogramando alarmas para el paciente: ${patientId}`);

    // Obtener citas y medicamentos directamente de la base de datos local
    const appointments = await localDB.getAppointments(patientId);
    const medications = await localDB.getMedications(patientId);

    console.log(`[Background] Encontrados ${medications.length} medicamentos y ${appointments.length} citas.`);

    // Reprogramar recordatorios de medicamentos
    for (const med of medications) {
      if (med.time) {
        // La función scheduleMedicationReminder ya contiene la lógica para
        // cancelar notificaciones anteriores y reprogramar, por lo que es seguro llamarla.
        await scheduleMedicationReminder(med);
      }
    }

    // Reprogramar recordatorios de citas
    for (const appt of appointments) {
      if (appt.dateTime) {
        await scheduleAppointmentReminder({
          id: appt.id,
          title: appt.title,
          location: appt.location,
          dateTime: new Date(appt.dateTime),
          patientProfileId: appt.patientProfileId,
        });
      }
    }

    console.log('[Background] Tarea de reprogramación completada.');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error(`[${ALARM_BACKGROUND_FETCH_TASK}] Error en la tarea en segundo plano:`, error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Función para registrar la tarea en segundo plano
export async function registerBackgroundFetchAsync() {
  console.log('[Background] Registrando tarea de background fetch...');
  try {
    await BackgroundFetch.registerTaskAsync(ALARM_BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutos
      stopOnTerminate: false, // No detener si la app se cierra (Android)
      startOnBoot: true, // Iniciar automáticamente al arrancar (Android)
    });
    console.log('[Background] Tarea registrada exitosamente.');
  } catch (error) {
    console.error('[Background] Error al registrar la tarea:', error);
  }
}

// 3. Función para desregistrar la tarea
export async function unregisterBackgroundFetchAsync() {
  console.log('[Background] Desregistrando tarea de background fetch...');
  return BackgroundFetch.unregisterTaskAsync(ALARM_BACKGROUND_FETCH_TASK);
}
