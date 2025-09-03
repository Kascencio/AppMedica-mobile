import { buildApiUrl, buildApiUrlWithQuery, API_CONFIG, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES, NOTIFICATION_STATUSES } from '../constants/config';
import { useAuth } from '../store/useAuth';
import { useCurrentUser } from '../store/useCurrentUser';
import { checkNetworkConnectivity } from './network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  scheduleNotification, 
  cancelNotification, 
  getScheduledNotifications,
  scheduleMedicationReminder,
  scheduleAppointmentReminder,
  scheduleSnoozeMedication
} from './notifications';

// Tipos de notificación según la API
export interface ApiNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  metadata?: any;
  scheduledFor?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority?: string;
  metadata?: any;
  scheduledFor?: string;
}

export interface NotificationFilters {
  status?: string;
  type?: string;
  priority?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  percentages: {
    unread: number;
    read: number;
    archived: number;
  };
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  lastUpdated: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  filters?: NotificationFilters;
}

class NotificationService {
  private syncQueue: Array<{
    id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'ARCHIVE';
    data?: any;
    timestamp: number;
    retryCount: number;
  }> = [];
  
  private apiAvailable: boolean = false;
  private localNotifications: ApiNotification[] = [];

  // Verificar si la API de notificaciones está disponible
  private async checkApiAvailability(): Promise<boolean> {
    try {
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        this.apiAvailable = false;
        return false;
      }

      const token = useAuth.getState().userToken;
      if (!token) {
        this.apiAvailable = false;
        return false;
      }

      // Intentar hacer una petición simple para verificar si el endpoint existe
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.SYSTEM.HEALTH), {
        method: 'GET',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`
        }
      });

      this.apiAvailable = response.ok;
      return this.apiAvailable;
    } catch (error) {
      console.log('[NotificationService] API no disponible, usando modo local');
      this.apiAvailable = false;
      return false;
    }
  }

  // Verificar salud del sistema de notificaciones
  async checkHealth(): Promise<{ status: string; message: string; timestamp: string }> {
    try {
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        return {
          status: 'offline',
          message: 'Sin conexión a internet - Modo local activo',
          timestamp: new Date().toISOString()
        };
      }

      const token = useAuth.getState().userToken;
      if (!token) {
        return {
          status: 'unauthorized',
          message: 'Usuario no autenticado - Modo local activo',
          timestamp: new Date().toISOString()
        };
      }

      // Verificar si la API de notificaciones está disponible
      const apiAvailable = await this.checkApiAvailability();
      
      if (!apiAvailable) {
        return {
          status: 'local_only',
          message: 'API de notificaciones no disponible - Funcionando en modo local',
          timestamp: new Date().toISOString()
        };
      }

      // Si la API está disponible, verificar el endpoint de health
      try {
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.HEALTH), {
          headers: {
            ...API_CONFIG.DEFAULT_HEADERS,
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          return {
            status: 'healthy',
            message: data.message || 'Sistema funcionando correctamente',
            timestamp: data.timestamp || new Date().toISOString()
          };
        } else {
          return {
            status: 'unhealthy',
            message: 'Error en el servidor de notificaciones - Modo local activo',
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        return {
          status: 'local_only',
          message: 'API de notificaciones no disponible - Funcionando en modo local',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('[NotificationService] Error checking health:', error);
      return {
        status: 'error',
        message: 'Error verificando estado del sistema - Modo local activo',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Obtener notificaciones del usuario (híbrido: API + local)
  async getNotifications(filters?: NotificationFilters): Promise<PaginatedResponse<ApiNotification>> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        // Intentar obtener de la API
        try {
          const token = useAuth.getState().userToken;
          const url = buildApiUrlWithQuery(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE, filters);
          const response = await fetch(url, {
            headers: {
              ...API_CONFIG.DEFAULT_HEADERS,
              Authorization: `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            return data;
          }
        } catch (error) {
          console.log('[NotificationService] Error obteniendo de API, usando modo local');
        }
      }

      // Fallback: usar notificaciones locales
      return this.getLocalNotifications(filters);
    } catch (error) {
      console.error('[NotificationService] Error getting notifications:', error);
      return this.getLocalNotifications(filters);
    }
  }

  // Obtener notificaciones locales como fallback
  private async getLocalNotifications(filters?: NotificationFilters): Promise<PaginatedResponse<ApiNotification>> {
    try {
      await this.loadLocalNotifications();
      
      let filteredNotifications = [...this.localNotifications];
      
      // Aplicar filtros
      if (filters?.status) {
        filteredNotifications = filteredNotifications.filter(n => n.status === filters.status);
      }
      
      if (filters?.type) {
        filteredNotifications = filteredNotifications.filter(n => n.type === filters.type);
      }
      
      if (filters?.priority) {
        filteredNotifications = filteredNotifications.filter(n => n.priority === filters.priority);
      }
      
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredNotifications = filteredNotifications.filter(n => 
          n.title.toLowerCase().includes(searchLower) || 
          n.message.toLowerCase().includes(searchLower)
        );
      }

      // Paginación
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 20;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = filteredNotifications.slice(startIndex, endIndex);

      return {
        items: paginatedItems,
        meta: {
          total: filteredNotifications.length,
          page,
          pageSize,
          totalPages: Math.ceil(filteredNotifications.length / pageSize)
        },
        filters
      };
    } catch (error) {
      console.error('[NotificationService] Error getting local notifications:', error);
      return {
        items: [],
        meta: {
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0
        },
        filters
      };
    }
  }

  // Crear nueva notificación (híbrido)
  async createNotification(notificationData: CreateNotificationData): Promise<ApiNotification> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        // Intentar crear en la API
        try {
          const token = useAuth.getState().userToken;
          const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE), {
            method: 'POST',
            headers: {
              ...API_CONFIG.DEFAULT_HEADERS,
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(notificationData)
          });

          if (response.ok) {
            const data = await response.json();
            
            // Si la notificación tiene scheduledFor, programarla localmente también
            if (data.scheduledFor && this.shouldScheduleLocally(data.type)) {
              await this.scheduleLocalNotification(data);
            }

            return data;
          }
        } catch (error) {
          console.log('[NotificationService] Error creando en API, usando modo local');
        }
      }

      // Fallback: crear notificación local
      return this.createLocalNotification(notificationData);
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
      
      // Si hay error de red, agregar a la cola de sincronización
      if (error.message.includes('fetch') || error.message.includes('network')) {
        await this.addToSyncQueue('CREATE', notificationData);
      }
      
      // Crear localmente como fallback
      return this.createLocalNotification(notificationData);
    }
  }

  // Crear notificación local como fallback
  private async createLocalNotification(notificationData: CreateNotificationData): Promise<ApiNotification> {
    const localNotification: ApiNotification = {
      id: `local_${Date.now()}_${Math.random()}`,
      userId: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || NOTIFICATION_PRIORITIES.MEDIUM,
      status: NOTIFICATION_STATUSES.UNREAD,
      metadata: notificationData.metadata || {},
      scheduledFor: notificationData.scheduledFor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.localNotifications.unshift(localNotification);
    await this.saveLocalNotifications();
    
    // Si la notificación tiene scheduledFor, programarla localmente
    if (localNotification.scheduledFor && this.shouldScheduleLocally(localNotification.type)) {
      await this.scheduleLocalNotification(localNotification);
    }

    return localNotification;
  }

  // Marcar notificación como leída (híbrido)
  async markAsRead(notificationId: string): Promise<ApiNotification> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        // Intentar marcar como leída en la API
        try {
          const token = useAuth.getState().userToken;
          const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.READ, { id: notificationId });
          const response = await fetch(url, {
            method: 'PATCH',
            headers: {
              ...API_CONFIG.DEFAULT_HEADERS,
              Authorization: `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            return data;
          }
        } catch (error) {
          console.log('[NotificationService] Error marcando como leída en API, usando modo local');
        }
      }

      // Fallback: marcar como leída localmente
      return this.markLocalAsRead(notificationId);
    } catch (error) {
      console.error('[NotificationService] Error marking as read:', error);
      
      // Agregar a la cola de sincronización
      await this.addToSyncQueue('READ', { id: notificationId });
      
      // Marcar localmente como fallback
      return this.markLocalAsRead(notificationId);
    }
  }

  // Marcar como leída localmente
  private async markLocalAsRead(notificationId: string): Promise<ApiNotification> {
    const notification = this.localNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.status = NOTIFICATION_STATUSES.READ;
      notification.readAt = new Date().toISOString();
      notification.updatedAt = new Date().toISOString();
      await this.saveLocalNotifications();
      return notification;
    }
    
    throw new Error('Notificación no encontrada');
  }

  // Archivar notificación (híbrido)
  async archiveNotification(notificationId: string): Promise<ApiNotification> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        // Intentar archivar en la API
        try {
          const token = useAuth.getState().userToken;
          const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.ARCHIVE, { id: notificationId });
          const response = await fetch(url, {
            method: 'PATCH',
            headers: {
              ...API_CONFIG.DEFAULT_HEADERS,
              Authorization: `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            return data;
          }
        } catch (error) {
          console.log('[NotificationService] Error archivando en API, usando modo local');
        }
      }

      // Fallback: archivar localmente
      return this.archiveLocalNotification(notificationId);
    } catch (error) {
      console.error('[NotificationService] Error archiving notification:', error);
      
      // Agregar a la cola de sincronización
      await this.addToSyncQueue('ARCHIVE', { id: notificationId });
      
      // Archivar localmente como fallback
      return this.archiveLocalNotification(notificationId);
    }
  }

  // Archivar localmente
  private async archiveLocalNotification(notificationId: string): Promise<ApiNotification> {
    const notification = this.localNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.status = NOTIFICATION_STATUSES.ARCHIVED;
      notification.updatedAt = new Date().toISOString();
      await this.saveLocalNotifications();
      return notification;
    }
    
    throw new Error('Notificación no encontrada');
  }

  // Obtener estadísticas (híbrido)
  async getStats(): Promise<NotificationStats> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        // Intentar obtener de la API
        try {
          const token = useAuth.getState().userToken;
          const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.STATS), {
            headers: {
              ...API_CONFIG.DEFAULT_HEADERS,
              Authorization: `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            return data;
          }
        } catch (error) {
          console.log('[NotificationService] Error obteniendo stats de API, usando modo local');
        }
      }

      // Fallback: calcular estadísticas locales
      return this.getLocalStats();
    } catch (error) {
      console.error('[NotificationService] Error getting stats:', error);
      return this.getLocalStats();
    }
  }

  // Obtener estadísticas locales
  private async getLocalStats(): Promise<NotificationStats> {
    await this.loadLocalNotifications();
    
    const total = this.localNotifications.length;
    const unread = this.localNotifications.filter(n => n.status === NOTIFICATION_STATUSES.UNREAD).length;
    const read = this.localNotifications.filter(n => n.status === NOTIFICATION_STATUSES.READ).length;
    const archived = this.localNotifications.filter(n => n.status === NOTIFICATION_STATUSES.ARCHIVED).length;

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    this.localNotifications.forEach(notification => {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      byPriority[notification.priority] = (byPriority[notification.priority] || 0) + 1;
    });

    return {
      total,
      unread,
      read,
      archived,
      percentages: {
        unread: total > 0 ? Math.round((unread / total) * 100) : 0,
        read: total > 0 ? Math.round((read / total) * 100) : 0,
        archived: total > 0 ? Math.round((archived / total) * 100) : 0,
      },
      byType,
      byPriority,
      lastUpdated: new Date().toISOString()
    };
  }

  // Marcar múltiples notificaciones como leídas (híbrido)
  async markMultipleAsRead(notificationIds: string[]): Promise<{ message: string; processed: number; total: number }> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        // Intentar marcar múltiples en la API
        try {
          const token = useAuth.getState().userToken;
          const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BULK_READ), {
            method: 'PATCH',
            headers: {
              ...API_CONFIG.DEFAULT_HEADERS,
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ ids: notificationIds })
          });

          if (response.ok) {
            const data = await response.json();
            return data;
          }
        } catch (error) {
          console.log('[NotificationService] Error marcando múltiples en API, usando modo local');
        }
      }

      // Fallback: marcar múltiples localmente
      return this.markMultipleLocalAsRead(notificationIds);
    } catch (error) {
      console.error('[NotificationService] Error marking multiple as read:', error);
      return this.markMultipleLocalAsRead(notificationIds);
    }
  }

  // Marcar múltiples como leídas localmente
  private async markMultipleLocalAsRead(notificationIds: string[]): Promise<{ message: string; processed: number; total: number }> {
    let processed = 0;
    
    for (const id of notificationIds) {
      try {
        await this.markLocalAsRead(id);
        processed++;
      } catch (error) {
        console.error(`[NotificationService] Error marcando como leída: ${id}`, error);
      }
    }

    return {
      message: 'Notificaciones marcadas como leídas exitosamente',
      processed,
      total: notificationIds.length
    };
  }

  // Limpiar notificaciones antiguas (híbrido)
  async cleanupOldNotifications(): Promise<{ message: string; deletedCount: number; cutoffDate: string }> {
    try {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        // Intentar limpiar en la API
        try {
          const token = useAuth.getState().userToken;
          const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.CLEANUP), {
            method: 'DELETE',
            headers: {
              ...API_CONFIG.DEFAULT_HEADERS,
              Authorization: `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            return data;
          }
        } catch (error) {
          console.log('[NotificationService] Error limpiando en API, usando modo local');
        }
      }

      // Fallback: limpiar localmente
      return this.cleanupLocalOldNotifications();
    } catch (error) {
      console.error('[NotificationService] Error cleaning up notifications:', error);
      return this.cleanupLocalOldNotifications();
    }
  }

  // Limpiar notificaciones antiguas localmente
  private async cleanupLocalOldNotifications(): Promise<{ message: string; deletedCount: number; cutoffDate: string }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 días atrás
    
    const initialCount = this.localNotifications.length;
    
    this.localNotifications = this.localNotifications.filter(notification => {
      const notificationDate = new Date(notification.createdAt);
      return notificationDate > cutoffDate || notification.status !== NOTIFICATION_STATUSES.ARCHIVED;
    });
    
    const deletedCount = initialCount - this.localNotifications.length;
    await this.saveLocalNotifications();

    return {
      message: 'Limpieza completada exitosamente',
      deletedCount,
      cutoffDate: cutoffDate.toISOString()
    };
  }

  // Cargar notificaciones locales desde AsyncStorage
  private async loadLocalNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('localNotifications');
      if (stored) {
        this.localNotifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[NotificationService] Error loading local notifications:', error);
      this.localNotifications = [];
    }
  }

  // Guardar notificaciones locales en AsyncStorage
  private async saveLocalNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem('localNotifications', JSON.stringify(this.localNotifications));
    } catch (error) {
      console.error('[NotificationService] Error saving local notifications:', error);
    }
  }

  // Programar notificación local basada en datos de la API
  private async scheduleLocalNotification(apiNotification: ApiNotification): Promise<void> {
    try {
      const { type, title, message, metadata, scheduledFor } = apiNotification;
      
      if (!scheduledFor) return;

      const scheduledDate = new Date(scheduledFor);
      const now = new Date();

      // Solo programar si es en el futuro
      if (scheduledDate <= now) return;

      let trigger: any;
      let identifier: string;

      switch (type) {
        case NOTIFICATION_TYPES.MEDICATION_REMINDER:
          if (metadata?.medicationId) {
            identifier = `api_med_${metadata.medicationId}_${apiNotification.id}`;
            trigger = {
              type: 'date',
              date: scheduledDate
            };
          }
          break;

        case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
          if (metadata?.appointmentId) {
            identifier = `api_appt_${metadata.appointmentId}_${apiNotification.id}`;
            trigger = {
              type: 'date',
              date: scheduledDate
            };
          }
          break;

        default:
          identifier = `api_${apiNotification.id}`;
          trigger = {
            type: 'date',
            date: scheduledDate
          };
      }

      if (identifier && trigger) {
        await scheduleNotification({
          title,
          body: message,
          data: {
            ...metadata,
            apiNotificationId: apiNotification.id,
            type: 'API_NOTIFICATION'
          },
          trigger,
          identifier
        });

        console.log(`[NotificationService] Notificación API programada localmente: ${identifier}`);
      }
    } catch (error) {
      console.error('[NotificationService] Error scheduling local notification:', error);
    }
  }

  // Determinar si una notificación debe programarse localmente
  private shouldScheduleLocally(type: string): boolean {
    return [
      NOTIFICATION_TYPES.MEDICATION_REMINDER,
      NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
      NOTIFICATION_TYPES.TREATMENT_REMINDER
    ].includes(type);
  }

  // Agregar a la cola de sincronización
  private async addToSyncQueue(action: string, data: any): Promise<void> {
    try {
      const queueItem = {
        id: `sync_${Date.now()}_${Math.random()}`,
        action,
        data,
        timestamp: Date.now(),
        retryCount: 0
      };

      this.syncQueue.push(queueItem);
      await this.saveSyncQueue();
      
      console.log(`[NotificationService] Agregado a cola de sincronización: ${action}`);
    } catch (error) {
      console.error('[NotificationService] Error adding to sync queue:', error);
    }
  }

  // Guardar cola de sincronización
  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('notificationSyncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('[NotificationService] Error saving sync queue:', error);
    }
  }

  // Cargar cola de sincronización
  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('notificationSyncQueue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('[NotificationService] Error loading sync queue:', error);
    }
  }

  // Sincronizar cola pendiente
  async syncPendingQueue(): Promise<void> {
    try {
      await this.loadSyncQueue();
      
      if (this.syncQueue.length === 0) return;

      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) return;

      const token = useAuth.getState().userToken;
      if (!token) return;

      console.log(`[NotificationService] Sincronizando ${this.syncQueue.length} elementos pendientes`);

      const itemsToProcess = [...this.syncQueue];
      this.syncQueue = [];

      for (const item of itemsToProcess) {
        try {
          await this.processSyncItem(item);
        } catch (error) {
          console.error(`[NotificationService] Error processing sync item:`, error);
          
          // Reintentar si no se han agotado los intentos
          if (item.retryCount < 3) {
            item.retryCount++;
            this.syncQueue.push(item);
          }
        }
      }

      await this.saveSyncQueue();
      console.log('[NotificationService] Sincronización completada');
    } catch (error) {
      console.error('[NotificationService] Error syncing queue:', error);
    }
  }

  // Procesar item individual de sincronización con retry
  private async processSyncItem(item: any): Promise<void> {
    const maxRetries = 2;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const token = useAuth.getState().userToken;
        if (!token) {
          throw new Error('Token no disponible');
        }

        switch (item.action) {
          case 'CREATE':
            await this.createNotificationOnServer(item.data, token);
            break;
          case 'UPDATE':
            await this.updateNotificationOnServer(item.data.id, item.data, token);
            break;
          case 'DELETE':
            await this.deleteNotificationOnServer(item.data.id, token);
            break;
          case 'READ':
            await this.markAsReadOnServer(item.data.id, token);
            break;
          case 'ARCHIVE':
            await this.archiveNotificationOnServer(item.data.id, token);
            break;
          default:
            throw new Error(`Acción no soportada: ${item.action}`);
        }
        
        return; // Éxito, salir del loop
      } catch (error: any) {
        console.error(`[NotificationService] Intento ${attempt + 1} falló para item ${item.id}:`, error);
        
        if (attempt === maxRetries) {
          throw error; // Re-lanzar error después de todos los intentos
        } else {
          // Esperar antes del siguiente intento
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  // Crear notificación en el servidor (API)
  private async createNotificationOnServer(data: CreateNotificationData, token: string): Promise<void> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE), {
        method: 'POST',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const newNotification = await response.json();
        await this.scheduleLocalNotification(newNotification); // Programar localmente
        console.log(`[NotificationService] Notificación creada en API: ${newNotification.id}`);
      } else {
        throw new Error(`Error al crear notificación en API: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[NotificationService] Error creando notificación en API:', error);
      throw error;
    }
  }

  // Actualizar notificación en el servidor (API)
  private async updateNotificationOnServer(id: string, data: CreateNotificationData, token: string): Promise<void> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE, { id }), {
        method: 'PATCH',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const updatedNotification = await response.json();
        await this.scheduleLocalNotification(updatedNotification); // Programar localmente
        console.log(`[NotificationService] Notificación actualizada en API: ${updatedNotification.id}`);
      } else {
        throw new Error(`Error al actualizar notificación en API: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[NotificationService] Error actualizando notificación en API:', error);
      throw error;
    }
  }

  // Eliminar notificación en el servidor (API)
  private async deleteNotificationOnServer(id: string, token: string): Promise<void> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE, { id }), {
        method: 'DELETE',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log(`[NotificationService] Notificación eliminada en API: ${id}`);
      } else {
        throw new Error(`Error al eliminar notificación en API: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[NotificationService] Error eliminando notificación en API:', error);
      throw error;
    }
  }

  // Marcar como leída en el servidor (API)
  private async markAsReadOnServer(id: string, token: string): Promise<void> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.READ, { id }), {
        method: 'PATCH',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const updatedNotification = await response.json();
        await this.scheduleLocalNotification(updatedNotification); // Programar localmente
        console.log(`[NotificationService] Notificación marcada como leída en API: ${id}`);
      } else {
        throw new Error(`Error al marcar como leída en API: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[NotificationService] Error marcando como leída en API:', error);
      throw error;
    }
  }

  // Archivar notificación en el servidor (API)
  private async archiveNotificationOnServer(id: string, token: string): Promise<void> {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.ARCHIVE, { id }), {
        method: 'PATCH',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const updatedNotification = await response.json();
        await this.scheduleLocalNotification(updatedNotification); // Programar localmente
        console.log(`[NotificationService] Notificación archivada en API: ${id}`);
      } else {
        throw new Error(`Error al archivar en API: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[NotificationService] Error archivando en API:', error);
      throw error;
    }
  }

  // Crear notificación de medicamento con integración API
  async createMedicationReminder(medicationData: {
    id: string;
    name: string;
    dosage: string;
    time: string;
    frequency?: string;
    patientProfileId: string;
  }): Promise<void> {
    try {
      const profile = useCurrentUser.getState().profile;
      if (!profile?.id) {
        throw new Error('Perfil de usuario no disponible');
      }

      // Crear notificación en la API o local
      const apiNotification = await this.createNotification({
        userId: profile.id,
        type: NOTIFICATION_TYPES.MEDICATION_REMINDER,
        title: `💊 ${medicationData.name}`,
        message: `Es hora de tomar ${medicationData.dosage}`,
        priority: NOTIFICATION_PRIORITIES.HIGH,
        metadata: {
          medicationId: medicationData.id,
          dosage: medicationData.dosage,
          frequency: medicationData.frequency || 'daily',
          patientProfileId: medicationData.patientProfileId
        },
        scheduledFor: new Date().toISOString() // Se programará para la próxima hora
      });

      // Programar notificación local
      await scheduleMedicationReminder({
        id: medicationData.id,
        name: medicationData.name,
        dosage: medicationData.dosage,
        time: medicationData.time,
        frequency: medicationData.frequency as any,
        patientProfileId: medicationData.patientProfileId
      });

      console.log(`[NotificationService] Recordatorio de medicamento creado: ${medicationData.name}`);
    } catch (error) {
      console.error('[NotificationService] Error creating medication reminder:', error);
      throw error;
    }
  }

  // Crear notificación de cita con integración API
  async createAppointmentReminder(appointmentData: {
    id: string;
    title: string;
    location: string;
    dateTime: Date;
    patientProfileId: string;
  }): Promise<void> {
    try {
      const profile = useCurrentUser.getState().profile;
      if (!profile?.id) {
        throw new Error('Perfil de usuario no disponible');
      }

      // Crear notificación en la API o local
      const apiNotification = await this.createNotification({
        userId: profile.id,
        type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
        title: `📅 ${appointmentData.title}`,
        message: `Cita programada en ${appointmentData.location}`,
        priority: NOTIFICATION_PRIORITIES.MEDIUM,
        metadata: {
          appointmentId: appointmentData.id,
          location: appointmentData.location,
          patientProfileId: appointmentData.patientProfileId
        },
        scheduledFor: appointmentData.dateTime.toISOString()
      });

      // Programar notificación local
      await scheduleAppointmentReminder({
        id: appointmentData.id,
        title: appointmentData.title,
        location: appointmentData.location,
        dateTime: appointmentData.dateTime,
        patientProfileId: appointmentData.patientProfileId
      });

      console.log(`[NotificationService] Recordatorio de cita creado: ${appointmentData.title}`);
    } catch (error) {
      console.error('[NotificationService] Error creating appointment reminder:', error);
      throw error;
    }
  }

  // Inicializar el servicio
  async initialize(): Promise<void> {
    try {
      await this.loadSyncQueue();
      await this.loadLocalNotifications();
      await this.syncPendingQueue();
      console.log('[NotificationService] Servicio inicializado correctamente');
    } catch (error) {
      console.error('[NotificationService] Error initializing service:', error);
    }
  }
}

// Exportar instancia singleton
export const notificationService = new NotificationService();

