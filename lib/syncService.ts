import NetInfo from '@react-native-community/netinfo';
import { localDB, SyncQueue } from '../data/db';
import { useAuth } from '../store/useAuth';
import { buildApiUrl, API_CONFIG } from '../constants/config';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

class SyncService {
  private isInitialized = false;
  private syncInProgress = false;
  private networkListener: (() => void) | null = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Inicializar base de datos local
      await localDB.init();
      
      // Configurar listener de red
      this.setupNetworkListener();
      
      // Intentar sincronización inicial
      await this.syncPendingData();
      
      this.isInitialized = true;
      console.log('[SyncService] Servicio de sincronización inicializado');
    } catch (error) {
      console.error('[SyncService] Error inicializando servicio:', error);
      throw error;
    }
  }

  private setupNetworkListener(): void {
    this.networkListener = NetInfo.addEventListener(state => {
      console.log('[SyncService] Estado de red cambiado:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type
      });

      // Si se restablece la conexión, intentar sincronizar
      if (state.isConnected && state.isInternetReachable) {
        this.syncPendingData();
      }
    });
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected || false,
      isInternetReachable: state.isInternetReachable || false,
      type: state.type || 'unknown'
    };
  }

  async isOnline(): Promise<boolean> {
    const status = await this.getNetworkStatus();
    return status.isConnected && status.isInternetReachable;
  }

  async syncPendingData(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[SyncService] Sincronización ya en progreso, saltando...');
      return;
    }

    const isOnline = await this.isOnline();
    if (!isOnline) {
      console.log('[SyncService] No hay conexión a internet, saltando sincronización');
      return;
    }

    const token = useAuth.getState().userToken;
    if (!token) {
      console.log('[SyncService] No hay token de autenticación, saltando sincronización');
      return;
    }

    this.syncInProgress = true;
    console.log('[SyncService] Iniciando sincronización de datos pendientes...');

    try {
      const syncQueue = await localDB.getSyncQueue();
      console.log('[SyncService] Elementos en cola de sincronización:', syncQueue.length);

      for (const item of syncQueue) {
        try {
          await this.processSyncItem(item, token);
          await localDB.removeFromSyncQueue(item.id);
          console.log('[SyncService] Elemento sincronizado exitosamente:', item.id);
        } catch (error) {
          console.error('[SyncService] Error sincronizando elemento:', item.id, error);
          
          // Incrementar contador de reintentos
          const newRetryCount = item.retryCount + 1;
          await localDB.updateRetryCount(item.id, newRetryCount);
          
          // Si ha fallado demasiadas veces, remover de la cola
          if (newRetryCount >= 3) {
            await localDB.removeFromSyncQueue(item.id);
            console.log('[SyncService] Elemento removido por demasiados fallos:', item.id);
          }
        }
      }

      console.log('[SyncService] Sincronización completada');
    } catch (error) {
      console.error('[SyncService] Error en sincronización:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processSyncItem(item: SyncQueue, token: string): Promise<void> {
    const headers = {
      ...API_CONFIG.DEFAULT_HEADERS,
      Authorization: `Bearer ${token}`
    };

    switch (item.entity) {
      case 'medications':
        await this.syncMedication(item, headers);
        break;
      case 'appointments':
        await this.syncAppointment(item, headers);
        break;
      case 'treatments':
        await this.syncTreatment(item, headers);
        break;
      case 'notes':
        await this.syncNote(item, headers);
        break;
      case 'intakeEvents':
        await this.syncIntakeEvent(item, headers);
        break;
      case 'notifications':
        await this.syncNotification(item, headers);
        break;
      default:
        throw new Error(`Entidad no soportada: ${item.entity}`);
    }
  }

  private async syncMedication(item: SyncQueue, headers: any): Promise<void> {
    const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.MEDICATIONS.BASE);
    
    switch (item.action) {
      case 'CREATE':
        await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(item.data)
        });
        break;
      case 'UPDATE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(item.data)
        });
        break;
      case 'DELETE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'DELETE',
          headers
        });
        break;
    }
  }

  private async syncAppointment(item: SyncQueue, headers: any): Promise<void> {
    const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.APPOINTMENTS.BASE);
    
    switch (item.action) {
      case 'CREATE':
        await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(item.data)
        });
        break;
      case 'UPDATE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(item.data)
        });
        break;
      case 'DELETE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'DELETE',
          headers
        });
        break;
    }
  }

  private async syncTreatment(item: SyncQueue, headers: any): Promise<void> {
    const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.TREATMENTS.BASE);
    
    switch (item.action) {
      case 'CREATE':
        await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(item.data)
        });
        break;
      case 'UPDATE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(item.data)
        });
        break;
      case 'DELETE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'DELETE',
          headers
        });
        break;
    }
  }

  private async syncNote(item: SyncQueue, headers: any): Promise<void> {
    const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.NOTES.BASE);
    
    switch (item.action) {
      case 'CREATE':
        await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(item.data)
        });
        break;
      case 'UPDATE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(item.data)
        });
        break;
      case 'DELETE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'DELETE',
          headers
        });
        break;
    }
  }

  private async syncIntakeEvent(item: SyncQueue, headers: any): Promise<void> {
    const endpoint = buildApiUrl(API_CONFIG.ENDPOINTS.INTAKE_EVENTS.BASE);
    
    switch (item.action) {
      case 'CREATE':
        await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(item.data)
        });
        break;
      case 'UPDATE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(item.data)
        });
        break;
      case 'DELETE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'DELETE',
          headers
        });
        break;
    }
  }

  private async syncNotification(item: SyncQueue, headers: any): Promise<void> {
    // soportar marcar como leída/archivar/eliminar como UPDATEs o DELETEs
    const base = buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE);
    const byId = (id: string) => buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.BY_ID, { id });
    const read = (id: string) => buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.READ, { id });
    const archive = (id: string) => buildApiUrl(API_CONFIG.ENDPOINTS.NOTIFICATIONS.ARCHIVE, { id });

    switch (item.action) {
      case 'UPDATE': {
        const { id, operation, data } = item.data || {};
        if (!id) return;
        if (operation === 'READ') {
          await fetch(read(id), { method: 'PATCH', headers });
        } else if (operation === 'ARCHIVE') {
          await fetch(archive(id), { method: 'PATCH', headers });
        } else {
          await fetch(byId(id), { method: 'PATCH', headers, body: JSON.stringify(data || {}) });
        }
        break;
      }
      case 'DELETE': {
        const { id } = item.data || {};
        if (!id) return;
        await fetch(byId(id), { method: 'DELETE', headers });
        break;
      }
      case 'CREATE': {
        await fetch(base, { method: 'POST', headers, body: JSON.stringify(item.data) });
        break;
      }
    }
  }

  async addToSyncQueue(action: 'CREATE' | 'UPDATE' | 'DELETE', entity: 'medications' | 'appointments' | 'treatments' | 'notes' | 'intakeEvents' | 'notifications', data: any): Promise<void> {
    const syncItem: SyncQueue = {
      id: `sync_${Date.now()}_${Math.random()}`,
      action,
      entity,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };

    await localDB.addToSyncQueue(syncItem);
    console.log('[SyncService] Elemento agregado a cola de sincronización:', syncItem.id);
  }

  async cleanup(): Promise<void> {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
    
    await localDB.close();
    this.isInitialized = false;
    console.log('[SyncService] Servicio de sincronización limpiado');
  }
}

// Instancia singleton
export const syncService = new SyncService();
