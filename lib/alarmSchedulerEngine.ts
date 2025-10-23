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
  // Se extiende para soportar 'treatment'; se tratará similar a medication
  type: 'medication' | 'appointment' | 'treatment';
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
  let endDate = config.endDate || new Date(now.getTime() + maxOccurrences * 24 * 60 * 60 * 1000);

  // Si endDate es antes que startDate (datos inconsistentes) o demasiado cercano para generar la primera ocurrencia, lo ajustamos más adelante.

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
        // Fallback inteligente: extender ventana si la primera ocurrencia cae fuera de endDate
        try {
          let firstCandidate: Date | null = null;
          if (config.frequency === 'daily') {
            firstCandidate = nextDateAtHourMinute(hour, minute, startDate);
          } else if (config.frequency === 'interval') {
            firstCandidate = nextDateAtHourMinute(hour, minute, startDate);
          } else if (config.frequency === 'weekly') {
            // Encontrar el siguiente día válido
            if (config.daysOfWeek && config.daysOfWeek.length > 0) {
              const probe = new Date(startDate);
              for (let i = 0; i < 14 && !firstCandidate; i++) {
                if (config.daysOfWeek.includes(probe.getDay())) {
                  const cand = new Date(probe);
                  cand.setHours(hour, minute, 0, 0);
                  if (cand > now) firstCandidate = cand;
                }
                probe.setDate(probe.getDate() + 1);
              }
            }
          }

            if (firstCandidate && firstCandidate > endDate) {
              // Extender endDate mínimo hasta incluir la primera ocurrencia
              endDate = new Date(firstCandidate);
              // Recalcular fechas
              switch (config.frequency) {
                case 'daily':
                  dates = datesForDaily(startDate, endDate, hour, minute); break;
                case 'weekly':
                  dates = datesForDaysOfWeekWithin(config.daysOfWeek || [], startDate, endDate, hour, minute); break;
                case 'interval':
                  dates = datesForIntervalHours(config.intervalHours!, startDate, endDate, hour, minute); break;
              }
            }

          const recalculated = dates.filter(date => date > now);
          if (recalculated.length === 0) {
            console.log('[AlarmSchedulerEngine] No hay fechas futuras válidas para programar (incluso tras fallback)');
            return [];
          }
          console.log('[AlarmSchedulerEngine] Fallback aplicado. Ocurrencias generadas:', recalculated.length);
          // Continuar usando las recalculadas
          dates = recalculated;
        } catch (fallbackErr) {
          console.warn('[AlarmSchedulerEngine] Error en fallback de generación de fechas:', fallbackErr);
          console.log('[AlarmSchedulerEngine] No hay fechas futuras válidas para programar');
          return [];
        }
      }

      // Programar cada fecha futura (usar for...of para esperar cada programación y evitar devolver vacío)
      const scheduledIds: string[] = [];
      const baseIdentifier = generateAlarmIdentifier(config.type, config.id, hour, minute, config.frequency);
      let index = 0;
      for (const date of futureDates) {
        const dayStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const identifier = `${baseIdentifier}_${dayStr}_${index}`;
        const scheduledAlarm: ScheduledAlarm = { identifier, config, scheduledDate: date };
        const notificationId = await this.scheduleNotification(config, date, identifier);
        scheduledAlarm.notificationId = notificationId;
        this.scheduledAlarms.set(identifier, scheduledAlarm);
        scheduledIds.push(identifier);
        console.log(`[AlarmSchedulerEngine] ✅ Alarma programada: ${config.name} (${identifier}) para ${date.toISOString()} (${config.time})`);
        index++;
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
    const isMedicationLike = config.type === 'medication' || config.type === 'treatment';
    const title = isMedicationLike ? `⏰ ${config.name}` : `📅 ${config.name}`;
    
    const body = isMedicationLike
      ? `Es hora de tomar ${config.data.dosage || config.data.treatmentName || 'tu tratamiento'}`
      : `Tu cita es en ${config.data.location ? `${config.data.location} - ` : ''}${date.toLocaleString()}`;

    const notificationData = {
      ...config.data,
      type: config.type.toUpperCase(),
      kind: config.type === 'medication' ? 'MED' : (config.type === 'treatment' ? 'TREATMENT' : 'APPOINTMENT'),
      scheduledFor: date.toISOString(),
      time: config.time,
      identifier,
      frequency: config.frequency,
      daysOfWeek: config.daysOfWeek,
      intervalHours: config.intervalHours,
    };

    if (isMedicationLike) {
      const nid = await scheduleMedicationReminder({ title, body, date, data: notificationData });
      return nid || identifier;
    } else {
      const nid = await scheduleAppointmentReminder({ title, body, date, data: notificationData });
      return nid || identifier;
    }
  }

  /**
   * Cancela todas las alarmas para un elemento específico
   * @param type Tipo de elemento ('medication' | 'appointment')
   * @param elementId ID del elemento
   * @returns Número de alarmas canceladas
   */
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
  async cancelAlarmsForElement(type: 'medication' | 'appointment' | 'treatment', elementId: string): Promise<number> {
    try {
      console.log('[AlarmSchedulerEngine] Cancelando alarmas para elemento:', type, elementId);
      const identifiersToCancel: string[] = [];
      for (const [identifier, scheduledAlarm] of this.scheduledAlarms) {
        if (scheduledAlarm.config.type === type && scheduledAlarm.config.id === elementId) {
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
   * Cancela una sola ocurrencia (la más cercana a una fecha objetivo) para soportar snooze
   * @param type Tipo de elemento
   * @param elementId ID del elemento
   * @param originalScheduledAt Fecha original aproximada que se desea posponer
   * @returns true si se canceló alguna
   */
  async cancelSingleOccurrence(type: string, elementId: string, originalScheduledAt: Date): Promise<boolean> {
    try {
      const alarms = this.getAlarmsForElement(type, elementId);
      if (alarms.length === 0) return false;
      // Buscar la alarma cuyo scheduledDate sea >= ahora y más cercana a originalScheduledAt
      const target = alarms
        .filter(a => a.scheduledDate >= new Date())
        .sort((a, b) => Math.abs(a.scheduledDate.getTime() - originalScheduledAt.getTime()) - Math.abs(b.scheduledDate.getTime() - originalScheduledAt.getTime()))[0];
      if (!target) return false;
      await this.cancelScheduledBatch([target.identifier]);
      return true;
    } catch (err) {
      console.warn('[AlarmSchedulerEngine] Error cancelando ocurrencia única:', err);
      return false;
    }
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
  await this.cancelAlarmsForElement(config.type as any, config.id);

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
