// lib/alarmTask.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

export const ALARM_BACKGROUND_FETCH_TASK = 'ALARM_BACKGROUND_FETCH_TASK';

TaskManager.defineTask(ALARM_BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('[AlarmTask] Ejecutando tarea en segundo plano...');
    
    // Verificar notificaciones programadas
    const { getScheduledNotifications } = await import('./notifications');
    const scheduled = await getScheduledNotifications();
    console.log('[AlarmTask] Notificaciones programadas:', scheduled.length);
    
    // Verificar si hay notificaciones próximas (en los próximos 30 minutos)
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    
    const upcomingNotifications = scheduled.filter(notification => {
      const triggerDate = notification.trigger as any;
      if (triggerDate?.date) {
        const notificationDate = new Date(triggerDate.date);
        return notificationDate > now && notificationDate <= thirtyMinutesFromNow;
      }
      return false;
    });
    
    console.log('[AlarmTask] Notificaciones próximas (30 min):', upcomingNotifications.length);
    
    // Log de próximas notificaciones para debugging
    upcomingNotifications.forEach(notification => {
      const triggerDate = notification.trigger as any;
      const date = new Date(triggerDate.date);
      console.log('[AlarmTask] Próxima notificación:', notification.content.title, 'a las', date.toLocaleTimeString());
    });
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    console.error('[AlarmTask] Error en tarea en segundo plano:', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerAlarmBackgroundTask() {
  try {
    console.log('[AlarmTask] Registrando tarea en segundo plano...');
    
    // Verificar si ya está registrada
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ALARM_BACKGROUND_FETCH_TASK);
    if (isRegistered) {
      console.log('[AlarmTask] Tarea ya está registrada');
      return true;
    }
    
    // Verificar estado de BackgroundFetch
    const status = await BackgroundFetch.getStatusAsync();
    console.log('[AlarmTask] Estado de BackgroundFetch:', status);
    
    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.log('[AlarmTask] BackgroundFetch denegado por el sistema');
      return false;
    }
    
    // Registrar la tarea
    await BackgroundFetch.registerTaskAsync(ALARM_BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60, // 15 minutos
      stopOnTerminate: false,
      startOnBoot: true,
    });
    
    console.log('[AlarmTask] ✅ Tarea en segundo plano registrada exitosamente');
    return true;
  } catch (e) {
    console.error('[AlarmTask] ❌ Error registrando tarea:', e);
    return false;
  }
}

export async function unregisterAlarmBackgroundTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ALARM_BACKGROUND_FETCH_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(ALARM_BACKGROUND_FETCH_TASK);
    }
    return true;
  } catch (e) {
    console.error('[AlarmTask] unregister error', e);
    return false;
  }
}

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

// Funciones de compatibilidad con el código existente
export async function registerBackgroundAlarmTask() {
  return registerAlarmBackgroundTask();
}

export async function unregisterBackgroundAlarmTask() {
  return unregisterAlarmBackgroundTask();
}