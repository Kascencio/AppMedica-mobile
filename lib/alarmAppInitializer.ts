// lib/alarmAppInitializer.ts
import { alarmSyncService } from './alarmSyncService';
import { alarmSystemInitializer } from './alarmSystemInitializer';
import { checkNetworkConnectivity } from './network';
import { useCurrentUser } from '../store/useCurrentUser';

/**
 * Inicializador principal del sistema de alarmas de la aplicación
 * Se ejecuta al arranque de la app para configurar todo el sistema de alarmas
 */
class AlarmAppInitializer {
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;
  
  /**
   * Inicializar el sistema completo de alarmas
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      console.log('[AlarmAppInitializer] Sistema ya inicializado');
      return true;
    }
    
    if (this.initPromise) {
      console.log('[AlarmAppInitializer] Inicialización en progreso, esperando...');
      return this.initPromise;
    }
    
    this.initPromise = this._performInitialization();
    const result = await this.initPromise;
    this.initPromise = null;
    
    return result;
  }
  
  /**
   * Realizar la inicialización completa paso a paso
   */
  private async _performInitialization(): Promise<boolean> {
    try {
      console.log('[AlarmAppInitializer] 🚀 Iniciando sistema de alarmas...');
      
      // Paso 1: Inicializar sistema local de alarmas
      console.log('[AlarmAppInitializer] 📱 Inicializando sistema local...');
      const localInit = await alarmSystemInitializer.initialize();
      if (!localInit) {
        console.error('[AlarmAppInitializer] ❌ Fallo en inicialización local');
        return false;
      }
      
      // Paso 2: Verificar si hay usuario autenticado
      const profile = useCurrentUser.getState().profile;
      if (!profile?.patientProfileId) {
        console.log('[AlarmAppInitializer] ⚠️ No hay usuario autenticado, omitiendo sincronización');
        this.initialized = true;
        return true;
      }
      
      // Paso 3: Verificar conectividad y sincronizar si es posible
      const isOnline = await checkNetworkConnectivity();
      if (isOnline) {
        console.log('[AlarmAppInitializer] 🌐 Conectividad disponible, sincronizando alarmas...');
        try {
          const syncSuccess = await alarmSyncService.syncAlarms();
          if (syncSuccess) {
            console.log('[AlarmAppInitializer] ✅ Sincronización completada exitosamente');
          } else {
            console.log('[AlarmAppInitializer] ⚠️ Sincronización falló pero continuando...');
          }
        } catch (syncError) {
          console.warn('[AlarmAppInitializer] ⚠️ Error en sincronización:', syncError);
          // No fallar la inicialización por problemas de sync
        }
      } else {
        console.log('[AlarmAppInitializer] 📵 Sin conectividad, omitiendo sincronización');
      }
      
      // Paso 4: Configurar listener para sincronización periódica
      this.setupPeriodicSync();
      
      this.initialized = true;
      console.log('[AlarmAppInitializer] ✅ Sistema de alarmas inicializado correctamente');
      
      return true;
    } catch (error) {
      console.error('[AlarmAppInitializer] ❌ Error en inicialización:', error);
      return false;
    }
  }
  
  /**
   * Configurar sincronización periódica en segundo plano
   */
  private setupPeriodicSync() {
    // Sincronizar cada 30 minutos cuando la app esté activa
    const syncInterval = setInterval(async () => {
      try {
        const profile = useCurrentUser.getState().profile;
        if (profile?.patientProfileId) {
          const isOnline = await checkNetworkConnectivity();
          if (isOnline) {
            console.log('[AlarmAppInitializer] 🔄 Sincronización automática...');
            await alarmSyncService.syncAlarms();
          }
        }
      } catch (error) {
        console.warn('[AlarmAppInitializer] Error en sincronización automática:', error);
      }
    }, 30 * 60 * 1000); // 30 minutos
    
    // Limpiar al cerrar app (esto es básico, en una app real necesitarías mejor lifecycle)
    if (typeof window !== 'undefined') {
      window.addEventListener?.('beforeunload', () => {
        clearInterval(syncInterval);
      });
    }
  }
  
  /**
   * Forzar re-sincronización (útil después de login o cambio de usuario)
   */
  async forceSyncAlarms(): Promise<boolean> {
    try {
      console.log('[AlarmAppInitializer] 🔄 Forzando sincronización de alarmas...');
      
      const profile = useCurrentUser.getState().profile;
      if (!profile?.patientProfileId) {
        console.log('[AlarmAppInitializer] No hay usuario autenticado para sincronizar');
        return false;
      }
      
      const isOnline = await checkNetworkConnectivity();
      if (!isOnline) {
        console.log('[AlarmAppInitializer] Sin conectividad para sincronizar');
        return false;
      }
      
      const syncSuccess = await alarmSyncService.syncAlarms();
      console.log('[AlarmAppInitializer] Resultado de sincronización forzada:', syncSuccess);
      
      return syncSuccess;
    } catch (error) {
      console.error('[AlarmAppInitializer] Error en sincronización forzada:', error);
      return false;
    }
  }
  
  /**
   * Reinicializar el sistema (útil para cambio de usuario)
   */
  async reinitialize(): Promise<boolean> {
    console.log('[AlarmAppInitializer] 🔄 Reinicializando sistema de alarmas...');
    this.initialized = false;
    this.initPromise = null;
    return this.initialize();
  }
  
  /**
   * Verificar si el sistema está inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Instancia singleton
export const alarmAppInitializer = new AlarmAppInitializer();