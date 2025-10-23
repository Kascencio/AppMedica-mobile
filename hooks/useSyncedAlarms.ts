// hooks/useSyncedAlarms.ts
import { useEffect, useState } from 'react';
import { alarmSyncService } from '../lib/alarmSyncService';
import { alarmAppInitializer } from '../lib/alarmAppInitializer';
import { BackendAlarm } from '../lib/alarmApiService';
import { checkNetworkConnectivity } from '../lib/network';

/**
 * Hook para manejar alarmas sincronizadas entre local y backend
 */
export function useSyncedAlarms() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [upcomingAlarms, setUpcomingAlarms] = useState<BackendAlarm[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Inicializar sistema de alarmas al montar el hook
  useEffect(() => {
    let isMounted = true;
    
    const initializeSystem = async () => {
      try {
        console.log('[useSyncedAlarms] Inicializando sistema de alarmas...');
        const success = await alarmAppInitializer.initialize();
        
        if (isMounted) {
          setIsInitialized(success);
          if (success) {
            console.log('[useSyncedAlarms] Sistema inicializado correctamente');
          }
        }
      } catch (error) {
        console.error('[useSyncedAlarms] Error en inicialización:', error);
        if (isMounted) {
          setIsInitialized(false);
        }
      }
    };
    
    initializeSystem();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Verificar conectividad periódicamente
  useEffect(() => {
    let isMounted = true;
    
    const checkConnectivity = async () => {
      try {
        const online = await checkNetworkConnectivity();
        if (isMounted) {
          setIsOnline(online);
        }
      } catch (error) {
        console.warn('[useSyncedAlarms] Error verificando conectividad:', error);
        if (isMounted) {
          setIsOnline(false);
        }
      }
    };
    
    checkConnectivity();
    const connectivityInterval = setInterval(checkConnectivity, 60000); // cada minuto
    
    return () => {
      isMounted = false;
      clearInterval(connectivityInterval);
    };
  }, []);
  
  // Obtener alarmas próximas cuando esté inicializado y online
  useEffect(() => {
    let isMounted = true;
    
    const loadUpcomingAlarms = async () => {
      if (!isInitialized || !isOnline) {
        return;
      }
      
      try {
        const alarms = await alarmSyncService.getUpcomingAlarms();
        if (isMounted) {
          setUpcomingAlarms(alarms);
          setLastSyncTime(new Date());
        }
      } catch (error) {
        console.warn('[useSyncedAlarms] Error cargando alarmas próximas:', error);
        if (isMounted) {
          setUpcomingAlarms([]);
        }
      }
    };
    
    loadUpcomingAlarms();
  }, [isInitialized, isOnline]);
  
  /**
   * Crear una alarma sincronizada
   */
  const createAlarm = async (
    type: 'medication' | 'appointment' | 'treatment',
    referenceId: string,
    config: {
      title: string;
      description?: string;
      scheduledTime: Date;
      frequency: 'daily' | 'weekly' | 'interval';
      daysOfWeek?: number[];
      reminderMinutes?: number;
      snoozeDuration?: number;
      maxSnoozes?: number;
    }
  ) => {
    try {
      console.log('[useSyncedAlarms] Creando alarma sincronizada:', { type, referenceId, title: config.title });
      
      const result = await alarmSyncService.createSyncedAlarm(type, referenceId, config);
      
      // Actualizar lista de alarmas próximas si está disponible
      if (isOnline) {
        const newUpcomingAlarms = await alarmSyncService.getUpcomingAlarms();
        setUpcomingAlarms(newUpcomingAlarms);
        setLastSyncTime(new Date());
      }
      
      return result;
    } catch (error) {
      console.error('[useSyncedAlarms] Error creando alarma:', error);
      throw error;
    }
  };
  
  /**
   * Actualizar una alarma sincronizada
   */
  const updateAlarm = async (
    backendAlarmId: string,
    localElementId: string,
    localElementType: 'medication' | 'appointment' | 'treatment',
    updates: {
      title?: string;
      description?: string;
      scheduledTime?: Date;
      frequency?: 'daily' | 'weekly' | 'interval';
      daysOfWeek?: number[];
      reminderMinutes?: number;
      snoozeDuration?: number;
      maxSnoozes?: number;
      isActive?: boolean;
    }
  ) => {
    try {
      console.log('[useSyncedAlarms] Actualizando alarma sincronizada:', backendAlarmId);
      
      const success = await alarmSyncService.updateSyncedAlarm(
        backendAlarmId, 
        localElementId, 
        localElementType, 
        updates
      );
      
      // Actualizar lista si está disponible
      if (success && isOnline) {
        const newUpcomingAlarms = await alarmSyncService.getUpcomingAlarms();
        setUpcomingAlarms(newUpcomingAlarms);
        setLastSyncTime(new Date());
      }
      
      return success;
    } catch (error) {
      console.error('[useSyncedAlarms] Error actualizando alarma:', error);
      throw error;
    }
  };
  
  /**
   * Eliminar una alarma sincronizada
   */
  const deleteAlarm = async (
    backendAlarmId: string,
    localElementId: string,
    localElementType: 'medication' | 'appointment' | 'treatment'
  ) => {
    try {
      console.log('[useSyncedAlarms] Eliminando alarma sincronizada:', backendAlarmId);
      
      const success = await alarmSyncService.deleteSyncedAlarm(
        backendAlarmId, 
        localElementId, 
        localElementType
      );
      
      // Actualizar lista si está disponible
      if (success && isOnline) {
        const newUpcomingAlarms = await alarmSyncService.getUpcomingAlarms();
        setUpcomingAlarms(newUpcomingAlarms);
        setLastSyncTime(new Date());
      }
      
      return success;
    } catch (error) {
      console.error('[useSyncedAlarms] Error eliminando alarma:', error);
      throw error;
    }
  };
  
  /**
   * Posponer una alarma
   */
  const snoozeAlarm = async (backendAlarmId: string) => {
    try {
      console.log('[useSyncedAlarms] Posponiendo alarma:', backendAlarmId);
      return await alarmSyncService.snoozeAlarm(backendAlarmId);
    } catch (error) {
      console.error('[useSyncedAlarms] Error posponiendo alarma:', error);
      throw error;
    }
  };
  
  /**
   * Completar una alarma
   */
  const dismissAlarm = async (backendAlarmId: string) => {
    try {
      console.log('[useSyncedAlarms] Completando alarma:', backendAlarmId);
      const success = await alarmSyncService.dismissAlarm(backendAlarmId);
      
      // Actualizar lista si está disponible
      if (success && isOnline) {
        const newUpcomingAlarms = await alarmSyncService.getUpcomingAlarms();
        setUpcomingAlarms(newUpcomingAlarms);
        setLastSyncTime(new Date());
      }
      
      return success;
    } catch (error) {
      console.error('[useSyncedAlarms] Error completando alarma:', error);
      throw error;
    }
  };
  
  /**
   * Forzar sincronización manual
   */
  const forceSync = async () => {
    try {
      console.log('[useSyncedAlarms] Forzando sincronización...');
      const success = await alarmAppInitializer.forceSyncAlarms();
      
      if (success && isOnline) {
        const newUpcomingAlarms = await alarmSyncService.getUpcomingAlarms();
        setUpcomingAlarms(newUpcomingAlarms);
        setLastSyncTime(new Date());
      }
      
      return success;
    } catch (error) {
      console.error('[useSyncedAlarms] Error en sincronización forzada:', error);
      throw error;
    }
  };
  
  return {
    // Estado
    isInitialized,
    isOnline,
    upcomingAlarms,
    lastSyncTime,
    
    // Acciones
    createAlarm,
    updateAlarm,
    deleteAlarm,
    snoozeAlarm,
    dismissAlarm,
    forceSync,
  };
}