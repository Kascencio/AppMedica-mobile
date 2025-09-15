import { Platform, Alert, Linking } from 'react-native';
import * as Device from 'expo-device';

/**
 * Servicio para manejar System Alert Window
 * Permite mostrar alarmas encima de otras aplicaciones
 */
export class SystemAlertWindowService {
  private static instance: SystemAlertWindowService;
  private isAlertWindowActive = false;

  public static getInstance(): SystemAlertWindowService {
    if (!SystemAlertWindowService.instance) {
      SystemAlertWindowService.instance = new SystemAlertWindowService();
    }
    return SystemAlertWindowService.instance;
  }

  /**
   * Mostrar alerta de alarma usando System Alert Window
   * Solo funciona en Android con el permiso SYSTEM_ALERT_WINDOW
   */
  public async showAlarmAlert(data: any): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('[SystemAlertWindowService] iOS no soporta System Alert Window');
      return false;
    }

    if (!Device.isDevice) {
      console.log('[SystemAlertWindowService] Simulador - usando alerta normal');
      this.showFallbackAlert(data);
      return true;
    }

    try {
      // Verificar permiso de overlay
      const { overlayPermissionService } = await import('./overlayPermissionService');
      const hasPermission = await overlayPermissionService.checkOverlayPermission();
      
      if (!hasPermission) {
        console.log('[SystemAlertWindowService] Sin permiso de overlay, usando alerta normal');
        this.showFallbackAlert(data);
        return false;
      }

      console.log('[SystemAlertWindowService] Mostrando alerta de alarma con System Alert Window...');
      
      // En React Native, no podemos crear directamente System Alert Window
      // Pero podemos usar una estrategia alternativa:
      // 1. Mostrar notificación con máxima prioridad
      // 2. Usar fullScreenIntent para abrir la app
      // 3. Como respaldo, mostrar alerta del sistema
      
      await this.showSystemAlertWithFallback(data);
      return true;
      
    } catch (error) {
      console.error('[SystemAlertWindowService] Error mostrando alerta de alarma:', error);
      this.showFallbackAlert(data);
      return false;
    }
  }

  /**
   * Mostrar alerta del sistema con respaldo
   */
  private async showSystemAlertWithFallback(data: any) {
    try {
      // Crear notificación de alta prioridad que debería abrir la app
      const { scheduleNotification } = await import('./notifications');
      
      const alarmTitle = this.getAlarmTitle(data);
      const alarmBody = this.getAlarmBody(data);
      
      // Programar notificación inmediata con máxima prioridad
      const notificationId = await scheduleNotification({
        title: alarmTitle,
        body: alarmBody,
        data: {
          ...data,
          systemAlert: true,
          immediate: true
        },
        trigger: null // Inmediata
      });
      
      console.log('[SystemAlertWindowService] Notificación de sistema programada:', notificationId);
      
      // Como respaldo adicional, mostrar alerta del sistema después de un delay
      setTimeout(() => {
        this.showFallbackAlert(data);
      }, 3000);
      
    } catch (error) {
      console.error('[SystemAlertWindowService] Error creando notificación de sistema:', error);
      this.showFallbackAlert(data);
    }
  }

  /**
   * Mostrar alerta de respaldo (funciona sin permisos especiales)
   */
  private showFallbackAlert(data: any) {
    const title = this.getAlarmTitle(data);
    const message = this.getAlarmBody(data);
    
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Abrir App',
          onPress: () => {
            // Intentar abrir la app
            this.openAppFromAlert(data);
          }
        },
        {
          text: 'Cerrar',
          style: 'cancel'
        }
      ],
      {
        cancelable: false // No se puede cancelar fácilmente
      }
    );
  }

  /**
   * Intentar abrir la app desde la alerta
   */
  private async openAppFromAlert(data: any) {
    try {
      console.log('[SystemAlertWindowService] Intentando abrir app desde alerta...');
      
      // En React Native, no podemos abrir la app directamente desde una alerta
      // Pero podemos navegar si la app ya está abierta
      // O mostrar instrucciones al usuario
      
      Alert.alert(
        'Abrir App',
        'Para gestionar esta alarma, por favor abre la aplicación RecuerdaMed manualmente.',
        [
          {
            text: 'Entendido',
            style: 'default'
          }
        ]
      );
      
    } catch (error) {
      console.error('[SystemAlertWindowService] Error abriendo app desde alerta:', error);
    }
  }

  /**
   * Obtener título de la alarma
   */
  private getAlarmTitle(data: any): string {
    if (data.type === 'MEDICATION' || data.kind === 'MED') {
      return '💊 Alarma de Medicamento';
    } else if (data.type === 'APPOINTMENT' || data.kind === 'APPOINTMENT') {
      return '📅 Alarma de Cita';
    } else if (data.type === 'TREATMENT' || data.kind === 'TREATMENT') {
      return '🏥 Alarma de Tratamiento';
    } else {
      return '⏰ Alarma';
    }
  }

  /**
   * Obtener cuerpo de la alarma
   */
  private getAlarmBody(data: any): string {
    const name = data.medicationName || data.appointmentTitle || data.treatmentName || data.name || 'Alarma';
    const dosage = data.dosage ? ` (${data.dosage})` : '';
    const time = data.scheduledFor ? `\nHora: ${new Date(data.scheduledFor).toLocaleTimeString()}` : '';
    
    return `${name}${dosage}${time}\n\nToca "Abrir App" para gestionar esta alarma.`;
  }

  /**
   * Verificar si el servicio está disponible
   */
  public async isServiceAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    if (!Device.isDevice) {
      return true; // En simulador asumimos que funciona
    }

    try {
      const { overlayPermissionService } = await import('./overlayPermissionService');
      const hasPermission = await overlayPermissionService.checkOverlayPermission();
      return hasPermission;
    } catch (error) {
      console.error('[SystemAlertWindowService] Error verificando disponibilidad:', error);
      return false;
    }
  }

  /**
   * Configurar el servicio
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log('[SystemAlertWindowService] Inicializando servicio...');
      
      const isAvailable = await this.isServiceAvailable();
      
      if (isAvailable) {
        console.log('[SystemAlertWindowService] ✅ Servicio inicializado correctamente');
      } else {
        console.log('[SystemAlertWindowService] ⚠️ Servicio no disponible (permisos faltantes)');
      }
      
      return isAvailable;
    } catch (error) {
      console.error('[SystemAlertWindowService] Error inicializando servicio:', error);
      return false;
    }
  }

  /**
   * Limpiar recursos
   */
  public cleanup() {
    console.log('[SystemAlertWindowService] Limpiando recursos...');
    this.isAlertWindowActive = false;
  }
}

// Exportar instancia singleton
export const systemAlertWindowService = SystemAlertWindowService.getInstance();
