import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkNetworkConnectivity, setupNetworkMonitoring } from '../lib/network';

interface OfflineData {
  medications: any[];
  appointments: any[];
  treatments: any[];
  notes: any[];
  intakeEvents: any[];
  pendingSync: any[];
  lastSync: string | null;
}

interface OfflineState extends OfflineData {
  isOnline: boolean;
  isSyncing: boolean;
  
  // Acciones
  setOnlineStatus: (status: boolean) => void;
  saveOfflineData: (key: keyof OfflineData, data: any) => Promise<void>;
  getOfflineData: (key: keyof OfflineData) => Promise<any>;
  addPendingSync: (action: 'CREATE' | 'UPDATE' | 'DELETE', entity: string, data: any) => Promise<void>;
  syncPendingData: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  initializeOffline: () => Promise<void>;
  checkConnectivity: () => Promise<boolean>;
}

export const useOffline = create<OfflineState>((set, get) => ({
  // Estado inicial
  isOnline: true,
  isSyncing: false,
  medications: [],
  appointments: [],
  treatments: [],
  notes: [],
  intakeEvents: [],
  pendingSync: [],
  lastSync: null,

  // Verificar conectividad de forma más robusta
  checkConnectivity: async () => {
    try {
      return await checkNetworkConnectivity();
    } catch (error) {
      console.error('[useOffline] Error verificando conectividad:', error);
      return false;
    }
  },

  // Inicializar sistema offline
  initializeOffline: async () => {
    try {
      console.log('[useOffline] Inicializando sistema offline...');
      
      // Cargar datos offline existentes de forma segura
      try {
        const offlineData = await AsyncStorage.getItem('offlineData');
        if (offlineData) {
          const parsed = JSON.parse(offlineData);
          set(parsed);
        }
      } catch (storageError) {
        console.error('[useOffline] Error cargando datos offline:', storageError);
      }
      
      // Cargar cola de sincronización de forma segura
      try {
        const pendingSync = await AsyncStorage.getItem('pendingSync');
        if (pendingSync) {
          set({ pendingSync: JSON.parse(pendingSync) });
        }
      } catch (syncError) {
        console.error('[useOffline] Error cargando cola de sincronización:', syncError);
      }
      
      // Verificar conectividad inicial de forma segura
      try {
        const initialConnectivity = await get().checkConnectivity();
        set({ isOnline: initialConnectivity });
      } catch (connectivityError) {
        console.error('[useOffline] Error verificando conectividad inicial:', connectivityError);
        set({ isOnline: false });
      }
      
      // Monitorear estado de conexión de forma segura
      try {
        setupNetworkMonitoring((isOnline) => {
          const wasOnline = get().isOnline;
          
          if (wasOnline !== isOnline) {
            console.log('[useOffline] Estado de conexión cambiado:', isOnline ? 'ONLINE' : 'OFFLINE');
            set({ isOnline });
            
            // Si volvimos a estar online, sincronizar de forma segura
            if (isOnline && get().pendingSync.length > 0) {
              setTimeout(() => {
                try {
                  get().syncPendingData();
                } catch (syncError) {
                  console.error('[useOffline] Error en sincronización automática:', syncError);
                }
              }, 1000); // Delay para evitar problemas de timing
            }
          }
        });
      } catch (monitoringError) {
        console.error('[useOffline] Error configurando monitoreo de red:', monitoringError);
      }
      
      console.log('[useOffline] Sistema offline inicializado');
    } catch (error) {
      console.error('[useOffline] Error inicializando:', error);
      // En caso de error, asumir offline para seguridad
      set({ isOnline: false });
    }
  },

  // Establecer estado online/offline
  setOnlineStatus: (status: boolean) => {
    set({ isOnline: status });
  },

  // Guardar datos offline
  saveOfflineData: async (key: keyof OfflineData, data: any) => {
    try {
      // Validar que data sea un array
      if (!Array.isArray(data)) {
        console.error('[useOffline] Error: data debe ser un array');
        return;
      }
      
      const currentState = get();
      const newState = { ...currentState, [key]: data };
      
      // Guardar en estado local
      set(newState);
      
      // Persistir en AsyncStorage de forma segura
      try {
        await AsyncStorage.setItem('offlineData', JSON.stringify(newState));
        console.log(`[useOffline] Datos offline guardados para ${key}:`, data.length, 'elementos');
      } catch (storageError) {
        console.error('[useOffline] Error guardando en AsyncStorage:', storageError);
        // No lanzar el error para evitar cierres
      }
    } catch (error) {
      console.error('[useOffline] Error guardando datos offline:', error);
      // No lanzar el error para evitar cierres
    }
  },

  // Obtener datos offline
  getOfflineData: async (key: keyof OfflineData) => {
    try {
      const data = await AsyncStorage.getItem('offlineData');
      if (data) {
        const parsed = JSON.parse(data);
        const result = parsed[key];
        
        // Asegurar que siempre devuelva un array
        if (Array.isArray(result)) {
          return result;
        } else {
          console.warn(`[useOffline] Datos para ${key} no es un array:`, result);
          return [];
        }
      }
      return [];
    } catch (error) {
      console.error('[useOffline] Error obteniendo datos offline:', error);
      return [];
    }
  },

  // Agregar acción a la cola de sincronización
  addPendingSync: async (action: 'CREATE' | 'UPDATE' | 'DELETE', entity: string, data: any) => {
    try {
      const currentState = get();
      const pendingItem = {
        id: Date.now().toString(),
        action,
        entity,
        data,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };
      
      const newPendingSync = [...currentState.pendingSync, pendingItem];
      
      // Actualizar estado
      set({ pendingSync: newPendingSync });
      
      // Persistir en AsyncStorage de forma segura
      try {
        await AsyncStorage.setItem('pendingSync', JSON.stringify(newPendingSync));
        console.log(`[useOffline] Acción agregada a cola de sincronización: ${action} ${entity}`);
      } catch (storageError) {
        console.error('[useOffline] Error guardando cola de sincronización:', storageError);
        // No lanzar el error para evitar cierres
      }
      
      // Si estamos online, intentar sincronizar inmediatamente de forma segura
      if (currentState.isOnline) {
        setTimeout(() => {
          try {
            get().syncPendingData();
          } catch (syncError) {
            console.error('[useOffline] Error en sincronización automática:', syncError);
          }
        }, 100); // Pequeño delay para evitar problemas de timing
      }
    } catch (error) {
      console.error('[useOffline] Error agregando a cola de sincronización:', error);
      // No lanzar el error para evitar cierres
    }
  },

  // Sincronizar datos pendientes
  syncPendingData: async () => {
    const currentState = get();
    if (currentState.isSyncing || !currentState.isOnline || currentState.pendingSync.length === 0) {
      return;
    }

    set({ isSyncing: true });
    
    try {
      console.log('[useOffline] Iniciando sincronización de datos pendientes...');
      
      const pendingItems = [...currentState.pendingSync];
      const successfulItems: string[] = [];
      const failedItems: any[] = [];
      
      for (const item of pendingItems) {
        try {
          // Aquí implementarías la lógica de sincronización con el backend
          // Por ahora solo simulamos el éxito
          console.log(`[useOffline] Sincronizando: ${item.action} ${item.entity}`);
          
          // Simular delay de red
          await new Promise(resolve => setTimeout(resolve, 100));
          
          successfulItems.push(item.id);
        } catch (error) {
          console.error(`[useOffline] Error sincronizando item ${item.id}:`, error);
          failedItems.push({ ...item, retryCount: item.retryCount + 1 });
        }
      }
      
      // Remover items exitosos
      const newPendingSync = currentState.pendingSync.filter(
        item => !successfulItems.includes(item.id)
      );
      
      // Reintentar items fallidos (máximo 3 intentos)
      const retryItems = failedItems.filter(item => item.retryCount < 3);
      const finalPendingSync = [...newPendingSync, ...retryItems];
      
      // Actualizar estado
      set({ 
        pendingSync: finalPendingSync,
        lastSync: new Date().toISOString()
      });
      
      // Persistir en AsyncStorage
      await AsyncStorage.setItem('pendingSync', JSON.stringify(finalPendingSync));
      
      console.log(`[useOffline] Sincronización completada. Exitosos: ${successfulItems.length}, Fallidos: ${failedItems.length}`);
      
    } catch (error) {
      console.error('[useOffline] Error en sincronización:', error);
    } finally {
      set({ isSyncing: false });
    }
  },

  // Limpiar datos offline
  clearOfflineData: async () => {
    try {
      await AsyncStorage.removeItem('offlineData');
      await AsyncStorage.removeItem('pendingSync');
      
      set({
        medications: [],
        appointments: [],
        treatments: [],
        notes: [],
        intakeEvents: [],
        pendingSync: [],
        lastSync: null,
      });
      
      console.log('[useOffline] Datos offline limpiados');
    } catch (error) {
      console.error('[useOffline] Error limpiando datos offline:', error);
    }
  },
}));
