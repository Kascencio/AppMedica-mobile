import { Platform, NativeModules } from 'react-native';

/**
 * Servicio para manejar alarmas usando el AlarmManager nativo de Android
 * Este servicio intenta usar el sistema nativo de alarmas de Android
 * para una mejor apertura automática de la app
 */
export class AndroidAlarmManager {
  private static instance: AndroidAlarmManager;

  private constructor() {}

  public static getInstance(): AndroidAlarmManager {
    if (!AndroidAlarmManager.instance) {
      AndroidAlarmManager.instance = new AndroidAlarmManager();
    }
    return AndroidAlarmManager.instance;
  }

  /**
   * Programar alarma usando el sistema nativo de Android
   */
  public async scheduleNativeAlarm({
    id,
    title,
    body,
    data,
    triggerDate,
  }: {
    id: string;
    title: string;
    body: string;
    data: any;
    triggerDate: Date;
  }) {
    try {
      if (Platform.OS !== 'android') {
        console.log('[AndroidAlarmManager] Solo disponible en Android');
        return false;
      }

      console.log('[AndroidAlarmManager] Programando alarma nativa...');

      // Intentar usar el módulo nativo si está disponible
      const { CustomAlarm } = NativeModules;
      if (CustomAlarm) {
        console.log('[AndroidAlarmManager] Usando CustomAlarm nativo...');
        
        await CustomAlarm.schedule({
          title,
          body,
          kind: data.kind || 'MEDICATION',
          refId: data.refId || id,
          name: data.name || title,
          dosage: data.dosage || '',
          instructions: data.instructions || '',
          scheduledFor: triggerDate.toISOString(),
          timestamp: triggerDate.getTime(),
          // Configuraciones adicionales para mejor apertura automática
          autoOpen: true,
          fullScreen: true,
          wakeUp: true,
          priority: 'HIGH',
        });
        
        console.log('[AndroidAlarmManager] Alarma nativa programada exitosamente');
        return true;
      } else {
        console.log('[AndroidAlarmManager] CustomAlarm no disponible, usando notificaciones estándar');
        return false;
      }
    } catch (error) {
      console.error('[AndroidAlarmManager] Error programando alarma nativa:', error);
      return false;
    }
  }

  /**
   * Cancelar alarma nativa
   */
  public async cancelNativeAlarm(id: string) {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      const { CustomAlarm } = NativeModules;
      if (CustomAlarm) {
        await CustomAlarm.cancel(id);
        console.log('[AndroidAlarmManager] Alarma nativa cancelada:', id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AndroidAlarmManager] Error cancelando alarma nativa:', error);
      return false;
    }
  }

  /**
   * Verificar si el módulo nativo está disponible
   */
  public isNativeModuleAvailable(): boolean {
    if (Platform.OS !== 'android') {
      return false;
    }

    const { CustomAlarm } = NativeModules;
    return !!CustomAlarm;
  }

  /**
   * Obtener información del módulo nativo
   */
  public getNativeModuleInfo() {
    if (Platform.OS !== 'android') {
      return { available: false, platform: 'ios' };
    }

    const { CustomAlarm } = NativeModules;
    return {
      available: !!CustomAlarm,
      platform: 'android',
      moduleName: CustomAlarm ? 'CustomAlarm' : 'No disponible',
    };
  }
}

// Exportar instancia singleton
export const androidAlarmManager = AndroidAlarmManager.getInstance();
