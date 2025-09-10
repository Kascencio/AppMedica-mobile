import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import { backgroundNotificationHandler } from './backgroundNotificationHandler';

/**
 * Servicio para manejar la apertura automática de la app
 * cuando llegan notificaciones de alarmas
 */
export class AppAutoOpenService {
  private static instance: AppAutoOpenService;
  private navigationRef: any = null;
  private isAppInForeground = false;

  private constructor() {}

  public static getInstance(): AppAutoOpenService {
    if (!AppAutoOpenService.instance) {
      AppAutoOpenService.instance = new AppAutoOpenService();
    }
    return AppAutoOpenService.instance;
  }

  /**
   * Configurar la referencia de navegación
   */
  public setNavigationRef(ref: any) {
    this.navigationRef = ref;
    backgroundNotificationHandler.setNavigationRef(ref);
  }

  /**
   * Configurar el estado de la app (foreground/background)
   */
  public setAppState(isForeground: boolean) {
    this.isAppInForeground = isForeground;
    console.log('[AppAutoOpenService] Estado de la app:', isForeground ? 'Foreground' : 'Background');
  }

  /**
   * Manejar notificación recibida
   */
  public async handleNotificationReceived(notification: Notifications.Notification) {
    const data = notification.request.content.data;
    console.log('[AppAutoOpenService] Notificación recibida:', data);

    // Verificar si es una notificación de alarma
    if (this.isAlarmNotification(data)) {
      console.log('[AppAutoOpenService] Es una alarma, manejando apertura automática...');
      
      if (this.isAppInForeground) {
        // Si la app está en foreground, navegar directamente
        this.navigateToAlarmScreen(data);
      } else {
        // Si la app está en background, intentar abrirla
        await this.openAppAndNavigate(data);
      }
    }
  }

  /**
   * Abrir la app y navegar a AlarmScreen
   */
  private async openAppAndNavigate(data: any) {
    try {
      console.log('[AppAutoOpenService] Intentando abrir la app...');
      
      // En Android, las notificaciones de alta prioridad deberían abrir la app automáticamente
      // En iOS, las notificaciones con shouldShowAlert: true también deberían abrir la app
      
      // Esperar un poco para que la app se abra
      setTimeout(() => {
        if (this.navigationRef && this.navigationRef.isReady()) {
          console.log('[AppAutoOpenService] Navegando a AlarmScreen...');
          this.navigateToAlarmScreen(data);
        } else {
          console.log('[AppAutoOpenService] Navegación no disponible, reintentando...');
          // Reintentar después de un delay
          setTimeout(() => {
            if (this.navigationRef && this.navigationRef.isReady()) {
              this.navigateToAlarmScreen(data);
            }
          }, 2000);
        }
      }, 1000);
      
    } catch (error) {
      console.error('[AppAutoOpenService] Error abriendo app:', error);
    }
  }

  /**
   * Navegar a AlarmScreen
   */
  private navigateToAlarmScreen(data: any) {
    try {
      console.log('[AppAutoOpenService] Navegando a AlarmScreen con datos:', data);
      
      this.navigationRef.navigate('AlarmScreen', {
        kind: data.kind || (data.type === 'MEDICATION' ? 'MED' : 'APPOINTMENT'),
        refId: data.medicationId || data.appointmentId || data.refId,
        scheduledFor: data.scheduledFor,
        name: data.medicationName || data.doctorName || data.name,
        dosage: data.dosage || '',
        instructions: data.instructions || data.notes || '',
        time: data.time,
        location: data.location || ''
      });
      
      console.log('[AppAutoOpenService] Navegación completada');
    } catch (error) {
      console.error('[AppAutoOpenService] Error navegando a AlarmScreen:', error);
    }
  }

  /**
   * Verificar si es una notificación de alarma
   */
  private isAlarmNotification(data: any): boolean {
    return data && (
      data.type === 'MEDICATION' ||
      data.kind === 'MED' ||
      data.type === 'APPOINTMENT' ||
      data.kind === 'APPOINTMENT' ||
      data.test === true // Para pruebas
    );
  }

  /**
   * Configurar listeners para notificaciones
   */
  public setupNotificationListeners() {
    console.log('[AppAutoOpenService] Configurando listeners de notificaciones...');
    
    // Listener para notificaciones recibidas
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[AppAutoOpenService] Notificación recibida en listener');
        this.handleNotificationReceived(notification);
      }
    );

    // Listener para respuestas a notificaciones (cuando el usuario toca la notificación)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[AppAutoOpenService] Respuesta a notificación recibida');
        const data = response.notification.request.content.data;
        if (this.isAlarmNotification(data)) {
          this.navigateToAlarmScreen(data);
        }
      }
    );

    return [notificationListener, responseListener];
  }

  /**
   * Limpiar listeners
   */
  public cleanup(listeners: any[]) {
    console.log('[AppAutoOpenService] Limpiando listeners...');
    listeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
  }
}

// Exportar instancia singleton
export const appAutoOpenService = AppAutoOpenService.getInstance();
