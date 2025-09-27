import { getScheduledNotifications } from './notifications';
import { alarmSchedulerEngine } from './alarmSchedulerEngine';

/**
 * Helper para obtener alarmas existentes de un elemento específico
 */
export async function getExistingAlarmsForElement(type: string, elementId: string) {
  try {
    // Obtener todas las notificaciones programadas
    const scheduledNotifications = await getScheduledNotifications();
    
    // Filtrar las que corresponden al elemento específico
    const elementAlarms = scheduledNotifications.filter(notification => {
      const data = notification.content.data;
      return (
        // Coincidir por ID del elemento, sin depender estrictamente del tipo
        (data?.medicationId === elementId || 
         data?.appointmentId === elementId || 
         data?.treatmentId === elementId ||
         data?.refId === elementId ||
         data?.id === elementId)
      );
    });

    // Extraer información de configuración de alarmas
    const alarmConfig = {
      selectedTimes: [] as Date[],
      frequencyType: 'daily' as 'daily' | 'daysOfWeek' | 'everyXHours',
      daysOfWeek: [] as number[],
      everyXHours: '8'
    };

    // Procesar cada alarma para extraer la configuración
    for (const alarm of elementAlarms) {
      const data = alarm.content.data;
      const trigger = alarm.trigger as any;
      
      if (trigger?.date) {
        const alarmDate = new Date(trigger.date);
        alarmConfig.selectedTimes.push(alarmDate);
      }
      
      // Extraer configuración de frecuencia si está disponible
      if (data?.frequencyType) {
        alarmConfig.frequencyType = data.frequencyType;
      }
      if (data?.daysOfWeek) {
        alarmConfig.daysOfWeek = data.daysOfWeek;
      }
      if (data?.everyXHours) {
        alarmConfig.everyXHours = data.everyXHours;
      }
    }

    // Eliminar duplicados de selectedTimes
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
