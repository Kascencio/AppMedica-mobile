// lib/snoozeService.ts
import * as Notifications from 'expo-notifications';
import { localDB } from '../data/db';
import { alarmSchedulerEngine } from './alarmSchedulerEngine';

export type SnoozeElementType = 'medication' | 'treatment' | 'appointment';

export interface SnoozeRecord {
  id: string;
  elementType: SnoozeElementType;
  elementId: string;
  originalScheduledAt: string;
  newScheduledAt: string;
  attempts: number;
  status: 'scheduled' | 'fired' | 'cancelled' | 'expired';
  createdAt: string;
  updatedAt: string;
}

interface SnoozeParams {
  elementType: SnoozeElementType;
  elementId: string;
  originalScheduledAt: Date; // Fecha de la ocurrencia que se pospone
  offsetMinutes?: number;
  title: string;
  body: string;
  data?: Record<string, any>;
}

const DEFAULT_OFFSET = 10;

export const snoozeService = {
  async snooze(params: SnoozeParams) {
    const offset = params.offsetMinutes ?? DEFAULT_OFFSET;
    const newDate = new Date(params.originalScheduledAt.getTime() + offset * 60000);

    const record: SnoozeRecord = {
      id: `snooze_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      elementType: params.elementType,
      elementId: params.elementId,
      originalScheduledAt: params.originalScheduledAt.toISOString(),
      newScheduledAt: newDate.toISOString(),
      attempts: 1,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Cancelar solo esa ocurrencia (si existe) en el motor
    try {
      await alarmSchedulerEngine.cancelSingleOccurrence(params.elementType, params.elementId, params.originalScheduledAt);
    } catch (err) {
      console.warn('[snoozeService] No se pudo cancelar ocurrencia original (continuando):', err);
    }

    // Programar notificación one-shot
    const identifier = `snooze_${params.elementType}_${params.elementId}_${newDate.getTime()}`;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: params.title,
          body: params.body,
          data: {
            ...(params.data || {}),
            snooze: true,
            elementType: params.elementType,
            elementId: params.elementId,
            originalScheduledAt: record.originalScheduledAt,
          },
        },
  trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: newDate } as any,
      });
    } catch (err) {
      console.error('[snoozeService] Error programando notificación snooze:', err);
      throw err;
    }

    // Guardar registro
    await localDB.saveSnoozeRecord(record);
    return { record, identifier };
  },

  async getActiveSnoozes(elementType: SnoozeElementType, elementId: string): Promise<SnoozeRecord[]> {
    return await localDB.getSnoozesForElement(elementType, elementId) as SnoozeRecord[];
  },

  async markFired(id: string) {
    await localDB.updateSnoozeStatus(id, 'fired');
  },

  async cancelSnooze(id: string) {
    await localDB.updateSnoozeStatus(id, 'cancelled');
  },

  async cleanupExpired(): Promise<number> {
    return await localDB.expireOldSnoozes();
  }
};

export default snoozeService;
