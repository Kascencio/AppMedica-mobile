import { create } from 'zustand';
import { 
  Notification, 
  NotificationFilters, 
  NotificationStats, 
  CreateNotificationData,
  PaginatedResponse,
  PaginationParams,
  buildApiUrl,
  buildApiUrlWithQuery,
  API_CONFIG,
  NOTIFICATION_STATUSES,
  NOTIFICATION_PRIORITIES
} from '../constants/config';
import { useAuth } from './useAuth';

interface NotificationsState {
  notifications: Notification[];
  stats: NotificationStats | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  
  // Acciones
  getNotifications: (filters?: NotificationFilters & PaginationParams) => Promise<void>;
  getNotification: (id: string) => Promise<Notification | null>;
  createNotification: (data: CreateNotificationData) => Promise<Notification | null>;
  updateNotification: (id: string, data: Partial<CreateNotificationData>) => Promise<Notification | null>;
  markAsRead: (id: string) => Promise<boolean>;
  markAsArchived: (id: string) => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;
  getStats: () => Promise<void>;
  markMultipleAsRead: (ids: string[]) => Promise<boolean>;
  cleanupOldNotifications: () => Promise<boolean>;
  clearError: () => void;
}

export const useNotifications = create<NotificationsState>((set, get) => ({
  notifications: [],
  stats: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },

  getNotifications: async (filters = {}) => {
    try {
      set({ loading: true, error: null });
      
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');

      const queryParams = {
        page: filters.page || 1,
        pageSize: filters.pageSize || 20,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.type && { type: filters.type }),
        ...(filters.search && { search: filters.search }),
      };

      const url = buildApiUrlWithQuery(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE, queryParams);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      
      // NUEVA ESTRUCTURA DEL BACKEND: items en lugar de data, meta en lugar de pagination
      set({
        notifications: data.items || data.data || [],
        pagination: data.meta || data.pagination || {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        },
        loading: false,
      });
    } catch (error: any) {
      console.error('[useNotifications] Error obteniendo notificaciones:', error);
      set({ 
        error: error.message || 'Error obteniendo notificaciones',
        loading: false 
      });
    }
  },

  getNotification: async (id: string) => {
    try {
      set({ error: null });
      
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BY_ID, { id });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const notification: Notification = await response.json();
      return notification;
    } catch (error: any) {
      console.error('[useNotifications] Error obteniendo notificación:', error);
      set({ error: error.message || 'Error obteniendo notificación' });
      return null;
    }
  },

  createNotification: async (data: CreateNotificationData) => {
    try {
      set({ error: null });
      
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const notification: Notification = await response.json();
      
      // Agregar a la lista local
      const currentNotifications = get().notifications;
      set({ notifications: [notification, ...currentNotifications] });
      
      return notification;
    } catch (error: any) {
      console.error('[useNotifications] Error creando notificación:', error);
      set({ error: error.message || 'Error creando notificación' });
      return null;
    }
  },

  updateNotification: async (id: string, data: Partial<CreateNotificationData>) => {
    try {
      set({ error: null });
      
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BY_ID, { id });
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const updatedNotification: Notification = await response.json();
      
      // Actualizar en la lista local
      const currentNotifications = get().notifications;
      const updatedNotifications = currentNotifications.map(notification =>
        notification.id === id ? updatedNotification : notification
      );
      
      set({ notifications: updatedNotifications });
      
      return updatedNotification;
    } catch (error: any) {
      console.error('[useNotifications] Error actualizando notificación:', error);
      set({ error: error.message || 'Error actualizando notificación' });
      return null;
    }
  },

  markAsRead: async (id: string) => {
    try {
      set({ error: null });
      
      const token = useAuth.getState().userToken;
      const { syncService } = await import('../lib/syncService');
      const online = await syncService.isOnline();
      if (!token && online) throw new Error('No autenticado');

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.READ, { id });
      
      // Si offline: actualizar local y encolar
      if (!online) {
        const currentNotifications = get().notifications;
        const updatedNotifications = currentNotifications.map(notification =>
          notification.id === id 
            ? { ...notification, status: NOTIFICATION_STATUSES.READ, readAt: new Date().toISOString() }
            : notification
        );
        set({ notifications: updatedNotifications });
        await (await import('../lib/syncService')).syncService.addToSyncQueue('UPDATE', 'notifications', { id, operation: 'READ' });
        return true;
      }

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      // Actualizar en la lista local
      const currentNotifications = get().notifications;
      const updatedNotifications = currentNotifications.map(notification =>
        notification.id === id 
          ? { ...notification, status: NOTIFICATION_STATUSES.READ, readAt: new Date().toISOString() }
          : notification
      );
      
      set({ notifications: updatedNotifications });
      
      return true;
    } catch (error: any) {
      console.error('[useNotifications] Error marcando como leída:', error);
      set({ error: error.message || 'Error marcando como leída' });
      return false;
    }
  },

  markAsArchived: async (id: string) => {
    try {
      set({ error: null });
      
      const token = useAuth.getState().userToken;
      const { syncService } = await import('../lib/syncService');
      const online = await syncService.isOnline();
      if (!token && online) throw new Error('No autenticado');

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.ARCHIVE, { id });
      
      // Si offline: actualizar local y encolar
      if (!online) {
        const currentNotifications = get().notifications;
        const updatedNotifications = currentNotifications.map(notification =>
          notification.id === id 
            ? { ...notification, status: NOTIFICATION_STATUSES.ARCHIVED }
            : notification
        );
        set({ notifications: updatedNotifications });
        await (await import('../lib/syncService')).syncService.addToSyncQueue('UPDATE', 'notifications', { id, operation: 'ARCHIVE' });
        return true;
      }

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      // Actualizar en la lista local
      const currentNotifications = get().notifications;
      const updatedNotifications = currentNotifications.map(notification =>
        notification.id === id 
          ? { ...notification, status: NOTIFICATION_STATUSES.ARCHIVED }
          : notification
      );
      
      set({ notifications: updatedNotifications });
      
      return true;
    } catch (error: any) {
      console.error('[useNotifications] Error archivando notificación:', error);
      set({ error: error.message || 'Error archivando notificación' });
      return false;
    }
  },

  deleteNotification: async (id: string) => {
    try {
      set({ error: null });
      
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BY_ID, { id });
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      // Remover de la lista local
      const currentNotifications = get().notifications;
      const filteredNotifications = currentNotifications.filter(notification => notification.id !== id);
      
      set({ notifications: filteredNotifications });
      
      return true;
    } catch (error: any) {
      console.error('[useNotifications] Error eliminando notificación:', error);
      set({ error: error.message || 'Error eliminando notificación' });
      return false;
    }
  },

  getStats: async () => {
    try {
      set({ error: null });
      
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.STATS);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const statsData: any = await response.json();
      
      // NUEVA ESTRUCTURA DEL BACKEND: agregar percentages y lastUpdated
      const stats: NotificationStats = {
        total: statsData.total || 0,
        unread: statsData.unread || 0,
        read: statsData.read || 0,
        archived: statsData.archived || 0,
        byPriority: {
          low: statsData.byPriority?.LOW || statsData.byPriority?.low || 0,
          medium: statsData.byPriority?.MEDIUM || statsData.byPriority?.medium || 0,
          high: statsData.byPriority?.HIGH || statsData.byPriority?.high || 0,
          urgent: statsData.byPriority?.URGENT || statsData.byPriority?.urgent || 0,
        },
        byType: statsData.byType || {},
        // Nuevos campos del backend
        percentages: statsData.percentages || {
          unread: 0,
          read: 0,
          archived: 0
        },
        lastUpdated: statsData.lastUpdated || new Date().toISOString()
      };
      
      set({ stats });
    } catch (error: any) {
      console.error('[useNotifications] Error obteniendo estadísticas:', error);
      set({ error: error.message || 'Error obteniendo estadísticas' });
    }
  },

  markMultipleAsRead: async (ids: string[]) => {
    try {
      set({ error: null });
      
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BULK_READ);
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      // Actualizar en la lista local
      const currentNotifications = get().notifications;
      const updatedNotifications = currentNotifications.map(notification =>
        ids.includes(notification.id)
          ? { ...notification, status: NOTIFICATION_STATUSES.READ, readAt: new Date().toISOString() }
          : notification
      );
      
      set({ notifications: updatedNotifications });
      
      return true;
    } catch (error: any) {
      console.error('[useNotifications] Error marcando múltiples como leídas:', error);
      set({ error: error.message || 'Error marcando múltiples como leídas' });
      return false;
    }
  },

  cleanupOldNotifications: async () => {
    try {
      set({ error: null });
      
      const token = useAuth.getState().userToken;
      if (!token) throw new Error('No autenticado');

      const url = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.CLEANUP);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      // Recargar notificaciones después de la limpieza
      const currentState = get();
      await currentState.getNotifications();
      
      return true;
    } catch (error: any) {
      console.error('[useNotifications] Error limpiando notificaciones antiguas:', error);
      set({ error: error.message || 'Error limpiando notificaciones antiguas' });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
