// lib/alarmSchedulerEngine.ts
import { scheduleMedicationReminder, scheduleAppointmentReminder } from './notifications';
import { 
  nextDateAtHourMinute, 
  datesForDaysOfWeekWithin, 
  datesForIntervalHours, 
  datesForDaily,
  generateAlarmIdentifier,
  parseTimeString
} from '../utils/alarmTime';

export interface AlarmConfig {
  id: string;
  type: 'medication' | 'appointment';
  name: string;
  time: string; // HH:mm format
  frequency: 'daily' | 'weekly' | 'interval';
  startDate?: Date;
  endDate?: Date;
  daysOfWeek?: number[]; // 0=domingo, 1=lunes, ..., 6=sábado
  intervalHours?: number; // para frequency: 'interval'
  reminderMinutes?: number; // para citas: minutos antes del evento
  data: any; // datos adicionales (dosage, location, etc.)
}

export interface ScheduledAlarm {
  identifier: string;
  config: AlarmConfig;
  scheduledDate: Date;
  notificationId?: string;
}

/**
 * Motor principal para programar alarmas desde configuración
 */
export class AlarmSchedulerEngine {
  private scheduledAlarms: Map<string, ScheduledAlarm> = new Map();

  /**
   * Programa alarmas desde una configuración
   * @param config Configuración de la alarma
   * @param maxOccurrences Número máximo de ocurrencias a programar (por defecto: 14 días)
   * @returns Array de identificadores de alarmas programadas
   */
  async scheduleAlarmsFromConfig(config: AlarmConfig, maxOccurrences: number = 14): Promise<string[]> {
    try {
      console.log('[AlarmSchedulerEngine] Programando alarmas para:', config.name);

      // Parsear la hora
      const timeData = parseTimeString(config.time);
      if (!timeData) {
        throw new Error(`Hora inválida: ${config.time}`);
      }

      const { hour, minute } = timeData;
      const now = new Date();
      const startDate = config.startDate || now;
      const endDate = config.endDate || new Date(now.getTime() + maxOccurrences * 24 * 60 * 60 * 1000);

      // Generar fechas según la frecuencia
      let dates: Date[];
      switch (config.frequency) {
        case 'daily':
          dates = datesForDaily(startDate, endDate, hour, minute);
          break;
        case 'weekly':
          if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
            throw new Error('daysOfWeek es requerido para frecuencia semanal');
          }
          dates = datesForDaysOfWeekWithin(config.daysOfWeek, startDate, endDate, hour, minute);
          break;
        case 'interval':
          if (!config.intervalHours || config.intervalHours <= 0) {
            throw new Error('intervalHours es requerido para frecuencia por intervalos');
          }
          dates = datesForIntervalHours(config.intervalHours, startDate, endDate, hour, minute);
          break;
        default:
          throw new Error(`Frecuencia no soportada: ${config.frequency}`);
      }

      // Filtrar fechas futuras únicamente
      const futureDates = dates.filter(date => date > now);
      
      if (futureDates.length === 0) {
        console.log('[AlarmSchedulerEngine] No hay fechas futuras válidas para programar');
        return [];
      }

      // Programar cada fecha futura
      const scheduledIds: string[] = [];
      for (const date of futureDates) {
        const identifier = generateAlarmIdentifier(config.type, config.id, hour, minute, config.frequency);
        const scheduledAlarm: ScheduledAlarm = {
          identifier,
          config,
          scheduledDate: date,
        };

        // Programar la notificación
        const notificationId = await this.scheduleNotification(config, date, identifier);
        scheduledAlarm.notificationId = notificationId;

        // Guardar en el mapa
        this.scheduledAlarms.set(identifier, scheduledAlarm);
        scheduledIds.push(identifier);

        console.log(`[AlarmSchedulerEngine] ✅ Alarma programada: ${config.name} para ${date.toISOString()} (${config.time})`);
      }

      console.log(`[AlarmSchedulerEngine] ${scheduledIds.length} alarmas programadas para ${config.name}`);
      return scheduledIds;

    } catch (error) {
      console.error('[AlarmSchedulerEngine] Error programando alarmas:', error);
      throw error;
    }
  }

  /**
   * Programa una notificación individual
   */
  private async scheduleNotification(config: AlarmConfig, date: Date, identifier: string): Promise<string> {
    const title = config.type === 'medication' 
      ? `⏰ ${config.name}` 
      : `📅 ${config.name}`;
    
    const body = config.type === 'medication'
      ? `Es hora de tomar ${config.data.dosage || 'tu medicamento'}`
      : `Tu cita es en ${config.data.location ? `${config.data.location} - ` : ''}${date.toLocaleString()}`;

    const notificationData = {
      ...config.data,
      type: config.type.toUpperCase(),
      kind: config.type === 'medication' ? 'MED' : 'APPOINTMENT',
      scheduledFor: date.toISOString(),
      time: config.time,
      identifier,
    };

    if (config.type === 'medication') {
      return await scheduleMedicationReminder({
        title,
        body,
        date,
        data: notificationData,
      });
    } else {
      return await scheduleAppointmentReminder({
        title,
        body,
        date,
        data: notificationData,
      });
    }
  }

  /**
   * Cancela todas las alarmas para un elemento específico
   * @param type Tipo de elemento ('medication' | 'appointment')
   * @param elementId ID del elemento
   * @returns Número de alarmas canceladas
   */
  async cancelAlarmsForElement(type: 'medication' | 'appointment', elementId: string): Promise<number> {
    try {
      console.log('[AlarmSchedulerEngine] Cancelando alarmas para elemento:', type, elementId);

      const identifiersToCancel: string[] = [];
      
      // Buscar alarmas que coincidan con el elemento
      for (const [identifier, alarm] of this.scheduledAlarms) {
        if (alarm.config.type === type && alarm.config.id === elementId) {
          identifiersToCancel.push(identifier);
        }
      }

      if (identifiersToCancel.length === 0) {
        console.log('[AlarmSchedulerEngine] No se encontraron alarmas para cancelar');
        return 0;
      }

      return await this.cancelScheduledBatch(identifiersToCancel);

    } catch (error) {
      console.error('[AlarmSchedulerEngine] Error cancelando alarmas para elemento:', error);
      throw error;
    }
  }

  /**
   * Cancela un lote de alarmas programadas
   * @param identifiers Array de identificadores a cancelar
   * @returns Número de alarmas canceladas
   */
  async cancelScheduledBatch(identifiers: string[]): Promise<number> {
    try {
      console.log('[AlarmSchedulerEngine] Cancelando lote de alarmas:', identifiers.length);

      let cancelledCount = 0;
      for (const identifier of identifiers) {
        const scheduledAlarm = this.scheduledAlarms.get(identifier);
        if (scheduledAlarm) {
          // Cancelar la notificación si tiene ID
          if (scheduledAlarm.notificationId) {
            try {
              const { cancelNotification } = await import('./notifications');
              await cancelNotification(scheduledAlarm.notificationId);
            } catch (error) {
              console.warn(`[AlarmSchedulerEngine] Error cancelando notificación ${scheduledAlarm.notificationId}:`, error);
            }
          }

          // Remover del mapa
          this.scheduledAlarms.delete(identifier);
          cancelledCount++;
        }
      }

      console.log(`[AlarmSchedulerEngine] ${cancelledCount} alarmas canceladas`);
      return cancelledCount;

    } catch (error) {
      console.error('[AlarmSchedulerEngine] Error cancelando lote:', error);
      throw error;
    }
  }

  /**
   * Cancela todas las alarmas de un elemento específico
   * @param type Tipo de elemento (medication, appointment)
   * @param elementId ID del elemento
   * @returns Número de alarmas canceladas
   */
  async cancelAlarmsForElement(type: string, elementId: string): Promise<number> {
    try {
      const identifiersToCancel: string[] = [];
      
      for (const [identifier, scheduledAlarm] of this.scheduledAlarms) {
        if (scheduledAlarm.config.type === type && scheduledAlarm.config.id === elementId) {
          identifiersToCancel.push(identifier);
        }
      }

      return await this.cancelScheduledBatch(identifiersToCancel);

    } catch (error) {
      console.error('[AlarmSchedulerEngine] Error cancelando alarmas del elemento:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las alarmas programadas
   * @returns Array de alarmas programadas
   */
  getScheduledAlarms(): ScheduledAlarm[] {
    return Array.from(this.scheduledAlarms.values());
  }

  /**
   * Obtiene alarmas programadas para un elemento específico
   * @param type Tipo de elemento
   * @param elementId ID del elemento
   * @returns Array de alarmas programadas
   */
  getAlarmsForElement(type: string, elementId: string): ScheduledAlarm[] {
    return Array.from(this.scheduledAlarms.values()).filter(
      alarm => alarm.config.type === type && alarm.config.id === elementId
    );
  }

  /**
   * Limpia alarmas expiradas (fechas pasadas)
   * @returns Número de alarmas limpiadas
   */
  async cleanupExpiredAlarms(): Promise<number> {
    try {
      const now = new Date();
      const expiredIdentifiers: string[] = [];

      for (const [identifier, scheduledAlarm] of this.scheduledAlarms) {
        if (scheduledAlarm.scheduledDate < now) {
          expiredIdentifiers.push(identifier);
        }
      }

      return await this.cancelScheduledBatch(expiredIdentifiers);

    } catch (error) {
      console.error('[AlarmSchedulerEngine] Error limpiando alarmas expiradas:', error);
      throw error;
    }
  }

  /**
   * Reprograma alarmas para un elemento (cancela las existentes y programa las nuevas)
   * @param config Nueva configuración
   * @param maxOccurrences Número máximo de ocurrencias
   * @returns Array de identificadores de alarmas programadas
   */
  async rescheduleAlarmsForElement(config: AlarmConfig, maxOccurrences: number = 14): Promise<string[]> {
    try {
      console.log('[AlarmSchedulerEngine] Reprogramando alarmas para:', config.name);

      // Cancelar alarmas existentes
      await this.cancelAlarmsForElement(config.type, config.id);

      // Programar nuevas alarmas
      return await this.scheduleAlarmsFromConfig(config, maxOccurrences);

    } catch (error) {
      console.error('[AlarmSchedulerEngine] Error reprogramando alarmas:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de alarmas programadas
   * @returns Objeto con estadísticas
   */
  getAlarmStats(): {
    total: number;
    byType: { [key: string]: number };
    byFrequency: { [key: string]: number };
    upcoming: number;
  } {
    const alarms = this.getScheduledAlarms();
    const now = new Date();

    const stats = {
      total: alarms.length,
      byType: {} as { [key: string]: number },
      byFrequency: {} as { [key: string]: number },
      upcoming: 0,
    };

    for (const alarm of alarms) {
      // Por tipo
      stats.byType[alarm.config.type] = (stats.byType[alarm.config.type] || 0) + 1;
      
      // Por frecuencia
      stats.byFrequency[alarm.config.frequency] = (stats.byFrequency[alarm.config.frequency] || 0) + 1;
      
      // Próximas (no expiradas)
      if (alarm.scheduledDate > now) {
        stats.upcoming++;
      }
    }

    return stats;
  }
}

// Instancia singleton del motor
export const alarmSchedulerEngine = new AlarmSchedulerEngine();
