import { getScheduledNotifications } from './notifications';
import { alarmSchedulerEngine } from './alarmSchedulerEngine';

/**
 * Helper para obtener alarmas existentes de un elemento específico
 */
export async function getExistingAlarmsForElement(type: string, elementId: string) {
  try {
    // 1) Intentar primero desde el motor en memoria (más fidedigno tras programar)
    const fromEngine = getExistingAlarmsFromEngine(type, elementId);
    const hasEngineData = fromEngine.selectedTimes.length > 0 || fromEngine.daysOfWeek.length > 0 || (fromEngine.everyXHours && fromEngine.everyXHours !== '8');
    if (hasEngineData) return fromEngine;

    // 2) Fallback: consultar notificaciones programadas del sistema
    const scheduledNotifications = await getScheduledNotifications();
    
    const elementAlarms = scheduledNotifications.filter(notification => {
      const data = notification.content.data;
      return (
        (data?.medicationId === elementId || 
         data?.appointmentId === elementId || 
         data?.treatmentId === elementId ||
         data?.refId === elementId ||
         data?.id === elementId)
      );
    });

    const alarmConfig = {
      selectedTimes: [] as Date[],
      frequencyType: 'daily' as 'daily' | 'daysOfWeek' | 'everyXHours',
      daysOfWeek: [] as number[],
      everyXHours: '8'
    };

    for (const alarm of elementAlarms) {
      const data = alarm.content.data as any;
      const trigger = (alarm as any).trigger;

      // Expo Notifications no siempre expone el trigger date; inferir desde datos guardados
      if (data?.scheduledFor) {
        const d = new Date(data.scheduledFor);
        if (!isNaN(d.getTime())) {
          alarmConfig.selectedTimes.push(d);
        }
      } else if (trigger?.date) {
        const d = new Date(trigger.date);
        if (!isNaN(d.getTime())) {
          alarmConfig.selectedTimes.push(d);
        }
      }

      if (data?.frequencyType) alarmConfig.frequencyType = data.frequencyType;
      if (Array.isArray(data?.daysOfWeek)) alarmConfig.daysOfWeek = data.daysOfWeek;
      if (data?.everyXHours) alarmConfig.everyXHours = String(data.everyXHours);
    }

    alarmConfig.selectedTimes = alarmConfig.selectedTimes.filter((time, index, self) => 
      index === self.findIndex(t => t.getTime() === time.getTime())
    );

    return alarmConfig;
  } catch (error) {
    console.error('[alarmHelper] Error obteniendo alarmas existentes:', error);
    return {
      selectedTimes: [],
      frequencyType: 'daily' as 'daily' | 'daysOfWeek' | 'everyXHours',
      daysOfWeek: [],
      everyXHours: '8'
    };
  }
}

/**
 * Helper para obtener alarmas existentes usando el motor de alarmas
 */
export function getExistingAlarmsFromEngine(type: string, elementId: string) {
  try {
    const alarms = alarmSchedulerEngine.getAlarmsForElement(type, elementId);
    
    const alarmConfig = {
      selectedTimes: [] as Date[],
      frequencyType: 'daily' as 'daily' | 'daysOfWeek' | 'everyXHours',
      daysOfWeek: [] as number[],
      everyXHours: '8'
    };

    // Procesar cada alarma
    for (const alarm of alarms) {
      if (alarm.scheduledFor) {
        alarmConfig.selectedTimes.push(new Date(alarm.scheduledFor));
      }
      
      if (alarm.config.frequencyType) {
        alarmConfig.frequencyType = alarm.config.frequencyType;
      }
      if (alarm.config.daysOfWeek) {
        alarmConfig.daysOfWeek = alarm.config.daysOfWeek;
      }
      if (alarm.config.intervalHours) {
        alarmConfig.everyXHours = alarm.config.intervalHours.toString();
      }
    }

    // Eliminar duplicados de selectedTimes
    alarmConfig.selectedTimes = alarmConfig.selectedTimes.filter((time, index, self) => 
      index === self.findIndex(t => t.getTime() === time.getTime())
    );

    return alarmConfig;
  } catch (error) {
    console.error('[alarmHelper] Error obteniendo alarmas del motor:', error);
    return {
      selectedTimes: [],
      frequencyType: 'daily' as 'daily' | 'daysOfWeek' | 'everyXHours',
      daysOfWeek: [],
      everyXHours: '8'
    };
  }
}
