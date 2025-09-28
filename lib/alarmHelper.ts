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
      // Usar la fecha real programada por el motor
      if ((alarm as any).scheduledDate) {
        alarmConfig.selectedTimes.push(new Date((alarm as any).scheduledDate));
      } else if ((alarm as any).scheduledFor) {
        alarmConfig.selectedTimes.push(new Date((alarm as any).scheduledFor));
      }
      
      // El motor usa 'frequency'; algunos flujos podrían usar 'frequencyType'
      const cfg: any = (alarm as any).config || {};
      if (cfg.frequency) {
        const f = String(cfg.frequency);
        alarmConfig.frequencyType = f === 'weekly' ? 'daysOfWeek' : (f === 'interval' ? 'everyXHours' : 'daily');
      } else if (cfg.frequencyType) {
        const f = String(cfg.frequencyType);
        alarmConfig.frequencyType = f === 'weekly' ? 'daysOfWeek' : (f === 'interval' ? 'everyXHours' : 'daily');
      }
      if (Array.isArray(cfg.daysOfWeek)) {
        alarmConfig.daysOfWeek = cfg.daysOfWeek;
      }
      if (cfg.intervalHours != null) {
        alarmConfig.everyXHours = String(cfg.intervalHours);
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
