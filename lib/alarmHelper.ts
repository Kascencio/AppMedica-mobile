import { getScheduledNotifications } from './notifications';
import { alarmSchedulerEngine, AlarmConfig } from './alarmSchedulerEngine';

/**
 * Helper para obtener alarmas existentes de un elemento específico
 */
export async function getExistingAlarmsForElement(type: string, elementId: string) {
  console.log(`[alarmHelper] Obteniendo alarmas existentes para ${type}:${elementId}`);
  
  try {
    // 1) Intentar primero desde el motor en memoria (más fidedigno tras programar)
    const fromEngine = getExistingAlarmsFromEngine(type, elementId);
    const hasEngineData = fromEngine.selectedTimes.length > 0 || fromEngine.daysOfWeek.length > 0 || (fromEngine.everyXHours && fromEngine.everyXHours !== '8');
    
    if (hasEngineData) {
      console.log(`[alarmHelper] Alarmas encontradas en motor:`, fromEngine);
      return fromEngine;
    }

    // 2) Fallback: consultar notificaciones programadas del sistema
    console.log(`[alarmHelper] Consultando notificaciones programadas del sistema...`);
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

    console.log(`[alarmHelper] Notificaciones encontradas para ${type}:${elementId}:`, elementAlarms.length);

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
        try {
          const d = new Date(data.scheduledFor);
          if (!isNaN(d.getTime())) {
            alarmConfig.selectedTimes.push(d);
            console.log(`[alarmHelper] Agregada hora desde scheduledFor:`, d.toISOString());
          }
        } catch (error) {
          console.warn(`[alarmHelper] Error parseando scheduledFor:`, data.scheduledFor, error);
        }
      } else if (trigger?.date) {
        try {
          const d = new Date(trigger.date);
          if (!isNaN(d.getTime())) {
            alarmConfig.selectedTimes.push(d);
            console.log(`[alarmHelper] Agregada hora desde trigger.date:`, d.toISOString());
          }
        } catch (error) {
          console.warn(`[alarmHelper] Error parseando trigger.date:`, trigger.date, error);
        }
      }

      if (data?.frequencyType) alarmConfig.frequencyType = data.frequencyType;
      if (Array.isArray(data?.daysOfWeek)) alarmConfig.daysOfWeek = data.daysOfWeek;
      if (data?.everyXHours) alarmConfig.everyXHours = String(data.everyXHours);
    }

    // Eliminar duplicados exactos
    alarmConfig.selectedTimes = alarmConfig.selectedTimes.filter((time, index, self) => 
      index === self.findIndex(t => t.getTime() === time.getTime())
    );

    // Normalizar a plantillas de hora (evitar múltiples días duplicados)
    if (alarmConfig.selectedTimes.length > 0) {
      const byTime: Record<string, Date> = {};
      for (const d of alarmConfig.selectedTimes) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const key = `${hh}:${mm}`;
        if (!byTime[key]) byTime[key] = d;
      }
      const today = new Date();
      alarmConfig.selectedTimes = Object.keys(byTime).sort().map((key) => {
        const [hh, mm] = key.split(':').map(n => parseInt(n, 10));
        const base = new Date(today);
        base.setHours(hh, mm, 0, 0);
        return base;
      });
    }

    console.log(`[alarmHelper] Configuración final de alarmas:`, alarmConfig);
    return alarmConfig;

  } catch (error) {
    console.error(`[alarmHelper] Error fatal obteniendo alarmas para ${type}:${elementId}:`, error);
    return {
      selectedTimes: [],
      frequencyType: 'daily',
      daysOfWeek: [],
      everyXHours: '8'
    };
  }
}

/**
 * Helper para programar un conjunto de alarmas para un elemento.
 * Esta función ahora actúa como un adaptador para el nuevo `alarmSchedulerEngine`.
 */
export async function scheduleAlarmsForElement(
  type: 'medication' | 'appointment' | 'treatment',
  elementId: string,
  // La configuración de la UI (más simple)
  uiAlarmConfig: {
    selectedTimes: string[];
    frequencyType: 'daily' | 'daysOfWeek' | 'everyXHours';
    daysOfWeek?: number[];
    everyXHours?: string;
  },
  // Datos para la notificación y la configuración del motor
  elementData: { name: string; [key: string]: any }
) {
  console.log(`[alarmHelper] Adaptando y programando alarmas para ${type}:${elementId}`, { uiAlarmConfig, elementData });

  try {
    // El nuevo motor programa una alarma por cada 'time'. Debemos iterar.
    const allScheduledIds: string[] = [];

    for (const time of uiAlarmConfig.selectedTimes) {
      // 1. Mapear uiAlarmConfig.frequencyType a lo que el motor espera
      let frequencyForEngine: 'daily' | 'weekly' | 'interval';
      switch (uiAlarmConfig.frequencyType) {
        case 'daysOfWeek':
          frequencyForEngine = 'weekly';
          break;
        case 'everyXHours':
          frequencyForEngine = 'interval';
          break;
        default:
          frequencyForEngine = 'daily';
      }

      // 2. Construir el objeto AlarmConfig que el motor entiende
      const engineConfig: AlarmConfig = {
        id: elementId,
        type: type,
        name: elementData.name,
        time: time, // Una alarma por cada hora seleccionada
        frequency: frequencyForEngine,
        daysOfWeek: uiAlarmConfig.daysOfWeek,
        intervalHours: uiAlarmConfig.everyXHours ? parseInt(uiAlarmConfig.everyXHours, 10) : undefined,
        data: elementData, // Pasar todos los datos del elemento
      };

      // 3. Llamar al método correcto del motor
      // Usamos reschedule para asegurarnos de que las viejas se limpien y se pongan las nuevas.
      const scheduledIds = await alarmSchedulerEngine.rescheduleAlarmsForElement(engineConfig);
      allScheduledIds.push(...scheduledIds);
    }

    console.log(`[alarmHelper] Total de alarmas programadas para ${type}:${elementId}: ${allScheduledIds.length}`, allScheduledIds);
    return allScheduledIds;

  } catch (error) {
    console.error(`[alarmHelper] Error programando alarmas para ${type}:${elementId}:`, error);
    return [];
  }
}


/**
 * Helper para cancelar todas las alarmas de un elemento
 */
export async function cancelAlarmsForElement(
  type: 'medication' | 'appointment' | 'treatment',
  elementId: string
) {
  console.log(`[alarmHelper] Cancelando todas las alarmas para ${type}:${elementId}`);
  try {
    // Llama al método correcto del motor
    const cancelledCount = await alarmSchedulerEngine.cancelAlarmsForElement(type, elementId);
    console.log(`[alarmHelper] ${cancelledCount} alarmas canceladas para ${type}:${elementId}`);
    return cancelledCount;
  } catch (error) {
    console.error(`[alarmHelper] Error cancelando alarmas para ${type}:${elementId}:`, error);
    return 0;
  }
}

/**
 * Obtiene la configuración de alarma desde el motor en memoria.
 * Esto es útil para obtener la configuración más reciente sin consultar al sistema.
 */
function getExistingAlarmsFromEngine(type: string, elementId: string) {
  // El nuevo motor no tiene un 'getInMemoryState' simple, sino que devuelve las alarmas programadas.
  const alarms = alarmSchedulerEngine.getAlarmsForElement(type, elementId);
  
  if (alarms.length > 0) {
    // Agregamos todas las horas y tomamos la configuración de la primera alarma como base
    const firstAlarmConfig = alarms[0].config;
    const allTimes = [...new Set(alarms.map(a => a.config.time))];

    let frequencyType: 'daily' | 'daysOfWeek' | 'everyXHours' = 'daily';
    if (firstAlarmConfig.frequency === 'weekly') frequencyType = 'daysOfWeek';
    if (firstAlarmConfig.frequency === 'interval') frequencyType = 'everyXHours';

    return {
      selectedTimes: allTimes,
      frequencyType: frequencyType,
      daysOfWeek: firstAlarmConfig.daysOfWeek || [],
      everyXHours: firstAlarmConfig.intervalHours?.toString() || '8',
    };
  }
  
  return {
    selectedTimes: [],
    frequencyType: 'daily' as 'daily' | 'daysOfWeek' | 'everyXHours',
    daysOfWeek: [],
    everyXHours: '8'
  };
}
