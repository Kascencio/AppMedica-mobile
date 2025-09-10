// Archivo temporal para compatibilidad con el build
// Las funciones reales están en notifications.ts

import {
  scheduleMedicationReminder,
  scheduleAppointmentReminder,
  scheduleSnoozeMedication,
  cancelMedicationNotifications,
  cancelAppointmentNotifications,
  cleanupOldNotifications,
  getNotificationStats,
  syncNotificationsWithBackend,
  repairNotifications,
  checkNotificationHealth,
  repairNotificationSystem,
  getScheduledNotifications,
  cancelNotification,
  cancelAllNotifications
} from './notifications';

// Tipos necesarios para compatibilidad
export interface ApiNotification {
  id: string;
  type: 'MEDICATION' | 'APPOINTMENT' | 'MEDICATION_SNOOZE';
  title: string;
  body: string;
  data: any;
  scheduledFor: string;
  createdAt: string;
  read: boolean;
  archived: boolean;
}

export interface NotificationStats {
  scheduled: number;
  stored: number;
  types: {
    medications: number;
    appointments: number;
    snooze: number;
  };
}

// Servicio de notificaciones que actúa como wrapper
export const notificationService = {
  async initialize() {
    console.log('[NotificationService] Inicializando servicio de notificaciones...');
    // La inicialización real se hace en App.tsx
    return true;
  },

  async getNotifications(filters?: any): Promise<ApiNotification[]> {
    try {
      const scheduled = await getScheduledNotifications();
      return scheduled.map(notification => ({
        id: notification.identifier,
        type: notification.content.data?.type || 'MEDICATION',
        title: notification.content.title || '',
        body: notification.content.body || '',
        data: notification.content.data || {},
        scheduledFor: notification.trigger?.type === 'date' 
          ? notification.trigger.date.toISOString() 
          : new Date().toISOString(),
        createdAt: notification.content.data?.createdAt || new Date().toISOString(),
        read: false,
        archived: false
      }));
    } catch (error) {
      console.error('[NotificationService] Error obteniendo notificaciones:', error);
      return [];
    }
  },

  async getStats(): Promise<NotificationStats> {
    return await getNotificationStats();
  },

  async checkHealth() {
    return await checkNotificationHealth();
  },

  async createMedicationReminder(data: any) {
    return await scheduleMedicationReminder(data);
  },

  async createAppointmentReminder(data: any) {
    return await scheduleAppointmentReminder(data);
  },

  async markAsRead(notificationId: string) {
    // En el sistema actual, las notificaciones se marcan como leídas cuando se abren
    console.log(`[NotificationService] Marcando como leída: ${notificationId}`);
    return true;
  },

  async archiveNotification(notificationId: string) {
    // Cancelar la notificación es equivalente a archivarla
    await cancelNotification(notificationId);
    return true;
  },

  async markMultipleAsRead(notificationIds: string[]) {
    console.log(`[NotificationService] Marcando múltiples como leídas: ${notificationIds.length}`);
    return true;
  },

  async cleanupOldNotifications() {
    return await cleanupOldNotifications();
  },

  async syncPendingQueue() {
    return await syncNotificationsWithBackend();
  }
};

// Exportar tipos para compatibilidad
export type { ApiNotification, NotificationStats };
