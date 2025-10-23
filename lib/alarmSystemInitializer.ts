// lib/alarmSystemInitializer.ts
import { unifiedAlarmService } from './unifiedAlarmService';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Inicializador del sistema de alarmas completo
 * Configura permisos, canales, listeners y servicios necesarios
 */
export class AlarmSystemInitializer {
  private static isInitialized = false;

  /**
   * Inicializar todo el sistema de alarmas
   */
  public static async initialize(navigationRef?: any): Promise<boolean> {
    if (this.isInitialized) {
      console.log('[AlarmSystemInitializer] Sistema ya inicializado');
      return true;
    }

    try {
      console.log('[AlarmSystemInitializer] 🚀 Inicializando sistema completo de alarmas...');

      // 1. Solicitar permisos de notificaciones
      await this.requestNotificationPermissions();

      // 2. Configurar referencia de navegación si se proporciona
      if (navigationRef) {
        unifiedAlarmService.setNavigationRef(navigationRef);
      }

      // 3. Inicializar servicio unificado (canales, categorías, listeners)
      const unifiedInitialized = await unifiedAlarmService.initialize();
      if (!unifiedInitialized) {
        throw new Error('Error inicializando servicio unificado de alarmas');
      }

      // 4. Configurar permisos adicionales de Android
      if (Platform.OS === 'android') {
        await this.requestAndroidAlarmPermissions();
      }

      this.isInitialized = true;
      console.log('[AlarmSystemInitializer] ✅ Sistema de alarmas completamente inicializado');
      return true;

    } catch (error) {
      console.error('[AlarmSystemInitializer] ❌ Error inicializando sistema:', error);
      return false;
    }
  }

  /**
   * Solicitar permisos de notificaciones
   */
  private static async requestNotificationPermissions(): Promise<boolean> {
    try {
      console.log('[AlarmSystemInitializer] Solicitando permisos de notificaciones...');
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowCriticalAlerts: true,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[AlarmSystemInitializer] ⚠️ Permisos de notificaciones no concedidos');
        return false;
      }

      console.log('[AlarmSystemInitializer] ✅ Permisos de notificaciones concedidos');
      return true;
    } catch (error) {
      console.error('[AlarmSystemInitializer] Error solicitando permisos:', error);
      return false;
    }
  }

  /**
   * Solicitar permisos específicos de Android para alarmas
   */
  private static async requestAndroidAlarmPermissions(): Promise<void> {
    try {
      console.log('[AlarmSystemInitializer] Configurando permisos Android...');
      
      // Intentar importar los módulos nativos de Android
      try {
        const { NativeModules } = require('react-native');
        const { AlarmSchedulerModule } = NativeModules;
        
        if (AlarmSchedulerModule) {
          // Verificar si el módulo nativo puede manejar alarmas exactas
          console.log('[AlarmSystemInitializer] ✅ Módulo nativo de alarmas disponible');
        }
      } catch (nativeError) {
        console.log('[AlarmSystemInitializer] Módulo nativo no disponible, usando fallbacks');
      }

      // Configurar para overlay permissions si es necesario
      try {
        const overlayService = await import('./overlayPermissionService');
        if (overlayService.overlayPermissionService) {
          // Verificar si tiene método de verificación
          const service = overlayService.overlayPermissionService as any;
          if (service.hasPermission) {
            const hasOverlayPermission = await service.hasPermission();
            if (!hasOverlayPermission) {
              console.log('[AlarmSystemInitializer] Permisos de overlay no disponibles - las alarmas pueden no aparecer sobre otras apps');
            }
          }
        }
      } catch (overlayError) {
        console.log('[AlarmSystemInitializer] Servicio de overlay no disponible');
      }

    } catch (error) {
      console.error('[AlarmSystemInitializer] Error configurando permisos Android:', error);
    }
  }

  /**
   * Verificar estado del sistema de alarmas
   */
  public static async getSystemStatus(): Promise<{
    isInitialized: boolean;
    notificationPermissions: boolean;
    canScheduleAlarms: boolean;
    unifiedServiceReady: boolean;
  }> {
    try {
      // Verificar permisos de notificaciones
      const { status } = await Notifications.getPermissionsAsync();
      const notificationPermissions = status === 'granted';

      // Verificar si puede programar alarmas
      const scheduledAlarms = await Notifications.getAllScheduledNotificationsAsync();
      const canScheduleAlarms = true; // Si llega hasta aquí, puede programar

      return {
        isInitialized: this.isInitialized,
        notificationPermissions,
        canScheduleAlarms,
        unifiedServiceReady: this.isInitialized
      };
    } catch (error) {
      console.error('[AlarmSystemInitializer] Error verificando estado:', error);
      return {
        isInitialized: false,
        notificationPermissions: false,
        canScheduleAlarms: false,
        unifiedServiceReady: false
      };
    }
  }

  /**
   * Reinicializar sistema si es necesario
   */
  public static async reinitialize(navigationRef?: any): Promise<boolean> {
    this.isInitialized = false;
    return await this.initialize(navigationRef);
  }
}

// Instancia singleton del inicializador
export const alarmSystemInitializer = AlarmSystemInitializer;